// Firebase 연결이에요. 안드로이드 퓨처셀프와 같은 프로젝트(futureself-b221d)를 같이 써서, 두 앱에 같은 기록과 댓글이 보여요.
// 사용자(익명 로그인)와 관리자(이메일 로그인)를 다른 Firebase 앱으로 나눠서, 관리자가 로그인하거나 나가도 내 댓글의 익명 ID가 바뀌지 않아요.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth, inMemoryPersistence, signInAnonymously, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore/lite";

/** 웹 앱 설정이에요(`firebase apps:sdkconfig WEB`). 공개되는 값이고, 권한은 보안 규칙이 지켜요. */
const CONFIG = {
  apiKey: "AIzaSyCtJ-JgUkTHEo1VTB0c6GgWlJFJM4_HGSQ",
  authDomain: "futureself-b221d.firebaseapp.com",
  projectId: "futureself-b221d",
  storageBucket: "futureself-b221d.firebasestorage.app",
  messagingSenderId: "859372832291",
  appId: "1:859372832291:web:7befdddf0293c9ec811396",
};

/** 개발 화면에서만 로컬 에뮬레이터를 써요(`VITE_FIREBASE_EMULATOR_HOST=127.0.0.1`). 출시 빌드에는 넣지 않아요. */
const EMULATOR_HOST = import.meta.env.DEV ? ((import.meta.env.VITE_FIREBASE_EMULATOR_HOST as string | undefined) ?? "") : "";
const EMULATOR_PROJECT = "demo-futureself";
const FIRESTORE_PORT = 8085;
const AUTH_PORT = 9095;

export interface FirebasePair {
  auth: Auth;
  db: Firestore;
}

function create(name?: string): FirebasePair {
  const config = EMULATOR_HOST ? { ...CONFIG, projectId: EMULATOR_PROJECT } : CONFIG;
  const app: FirebaseApp = name ? initializeApp(config, name) : initializeApp(config);
  // 팝업 로그인을 쓰지 않아서 popupRedirectResolver를 넣지 않아요. 토스 앱 화면에서 숨은 iframe을 띄우지 않게 해요.
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] });
  const db = getFirestore(app);
  if (EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_PORT);
  }
  return { auth, db };
}

let user: FirebasePair | null = null;
let admin: FirebasePair | null = null;

/** 읽기와 댓글에 쓰는 사용자 쪽이에요. */
export function userSide(): FirebasePair {
  user ??= create();
  return user;
}

/** 관리자 로그인과 관리자 쓰기에 쓰는 쪽이에요. */
export function adminSide(): FirebasePair {
  admin ??= create("admin");
  return admin;
}

let uid: Promise<string> | null = null;

/** 로그인 화면 없이 익명으로 로그인해요. 내 댓글을 구분하는 데만 써요. */
export function userId(): Promise<string> {
  uid ??= (async () => {
    const { auth } = userSide();
    await auth.authStateReady();
    return auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;
  })().catch((error: unknown) => {
    uid = null; // 다음에 다시 시도해요.
    throw error;
  });
  return uid;
}

/** 지금 로그인한 익명 ID예요. 아직 로그인 전이면 null이에요. */
export function currentUserId(): string | null {
  return userSide().auth.currentUser?.uid ?? null;
}
