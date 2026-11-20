import type { Language } from "./languages";

export interface PolicySection {
  heading: string;
  body: string[];
}

export interface Policy {
  effective: string;
  sections: PolicySection[];
}

const ko: Policy = {
  effective: "시행일: 2026년 11월 14일",
  sections: [
    {
      heading: "수집하는 정보",
      body: [
        "댓글을 쓸 때 Firebase 익명 로그인이 만든 익명 ID와 그 ID로 만든 네 자리 번호, 댓글 내용, 쓴 시각, 승인 상태를 저장해요. 짧은 시간에 댓글을 너무 많이 쓰지 못하게 익명 ID별로 쓴 개수와 시각도 저장해요.",
        "이름, 전화번호, 이메일은 받지 않아요. 로그인 화면도 없어요.",
        "앱을 쓰는 동안 열어 본 기록, 누른 버튼, 앱 오류 내용은 앱인토스 분석 기능으로 기록돼요.",
      ],
    },
    {
      heading: "이용 목적",
      body: ["댓글을 보여주고, 운영자가 공개 여부를 정하고, 같은 사람의 댓글을 같은 익명 번호로 표시하고, 댓글 도배를 막기 위해 써요. 이용 기록과 오류 기록은 서비스를 고치는 데 써요."],
    },
    {
      heading: "공개 범위",
      body: ["운영자가 승인한 댓글만 다른 사용자에게 보여요. 이름 대신 `익명 4821`처럼 네 자리 번호로 보이고, 익명 ID는 공개하지 않아요. 승인 전이나 공개하지 않기로 한 댓글은 쓴 사람에게만 보여요."],
    },
    {
      heading: "보관과 삭제",
      body: [
        "내 댓글은 언제든 직접 지울 수 있어요. 지우면 바로 사라져요. 지우지 않은 댓글은 서비스를 운영하는 동안 보관하고, 서비스를 끝내면 지워요.",
        "앱인토스 분석 기록은 토스 앱인토스의 기준에 따라 보관돼요. 내 댓글을 모두 지우고 싶다면 아래 이메일로 문의해 주세요.",
      ],
    },
    {
      heading: "기기에 저장하는 정보",
      body: ["언어, 목록 정렬, 디자인, 첫 화면 정보를 토스 앱 저장 공간에 저장해요. 다음에 앱을 열 때 빠르게 보여주기 위해서예요. Firebase 익명 로그인 정보도 기기에 저장돼요. 앱 데이터를 지우면 새 익명 ID가 만들어지고, 그 전에 쓴 승인 대기 댓글은 보이지 않아요."],
    },
    {
      heading: "외부 서비스",
      body: [
        "댓글과 기록은 Google의 Firebase(Cloud Firestore, 서울 리전)에 저장해요. 같은 내용을 쓰는 퓨처셀프 안드로이드 앱과 함께 써요. 앱 이용 기록은 토스 앱인토스에서 처리해요. 그 밖에는 개인정보를 다른 곳에 제공하거나 팔지 않아요.",
        "영상 썸네일은 YouTube 서버에서 직접 불러와요. 이때 기기의 인터넷 주소(IP)가 Google에 전달될 수 있어요.",
      ],
    },
    {
      heading: "문의와 책임자",
      body: ["개인정보 보호책임자: 퓨처셀프 운영자", "이메일: {email}", "열람, 정정, 삭제를 요청할 수 있어요. 이메일로 알려 주세요."],
    },
  ],
};

const en: Policy = {
  effective: "Effective November 14, 2026",
  sections: [
    {
      heading: "What we collect",
      body: [
        "When you comment, we store the anonymous ID created by Firebase anonymous sign-in, a four-digit number made from it, your comment, the time, and its review status. We also store how many comments each anonymous ID wrote and when, to stop comment flooding.",
        "We don't collect your name, phone number, or email. There is no sign-in screen.",
        "While you use the app, the notes you open, buttons you press, and app errors are recorded through Apps in Toss analytics.",
      ],
    },
    {
      heading: "How we use it",
      body: ["We use it to show comments, let the operator decide whether to publish them, show one person's comments with the same anonymous number, and prevent comment flooding. Usage and error records help us improve the service."],
    },
    {
      heading: "Who can see it",
      body: ["Other users only see comments the operator approved. They appear with a four-digit number like \"Anonymous 4821\" instead of a name, and your anonymous ID is never shown. Comments that are pending or not published are visible only to you."],
    },
    {
      heading: "Keeping and deleting",
      body: [
        "You can delete your comments at any time, and they are removed right away. Comments you keep are stored while the service runs and deleted when it ends.",
        "Apps in Toss analytics records are kept under Toss's Apps in Toss rules. To delete all your comments, contact us at the email below.",
      ],
    },
    {
      heading: "Stored on your device",
      body: ["Your language, list sort, design, and home screen data are saved in the Toss app's storage so the app opens quickly next time. Firebase anonymous sign-in data is also kept on your device. If you clear the app's data, a new anonymous ID is created and your earlier pending comments are no longer shown."],
    },
    {
      heading: "Other services",
      body: [
        "Comments and notes are stored in Google's Firebase (Cloud Firestore, Seoul region), shared with the FutureSelf Android app that shows the same content. Usage records are processed by Toss Apps in Toss. We don't otherwise share or sell personal information.",
        "Video thumbnails load directly from YouTube's servers, so your device's IP address may reach Google.",
      ],
    },
    {
      heading: "Contact",
      body: ["Privacy officer: FutureSelf operator", "Email: {email}", "You can ask to see, correct, or delete your information by email."],
    },
  ],
};

export const PRIVACY_POLICY: Record<Language, Policy> = { ko, en };

/** 웹판(GitHub Pages)은 토스 저장 공간과 앱인토스 분석을 쓰지 않아서 그 문장만 바꿔요. null이면 그 문장을 빼요. */
const WEB_LINES: Record<Language, { effective: string; lines: Record<string, string | null> }> = {
  ko: {
    effective: "시행일: 2026년 11월 20일",
    lines: {
      [ko.sections[0].body[2]]: null,
      [ko.sections[1].body[0]]: "댓글을 보여주고, 운영자가 공개 여부를 정하고, 같은 사람의 댓글을 같은 익명 번호로 표시하고, 댓글 도배를 막기 위해 써요.",
      [ko.sections[3].body[1]]: "내 댓글을 모두 지우고 싶다면 아래 이메일로 문의해 주세요.",
      [ko.sections[4].body[0]]: "언어, 목록 정렬, 디자인, 첫 화면 정보를 브라우저 저장 공간에 저장해요. 다음에 열 때 빠르게 보여주기 위해서예요. Firebase 익명 로그인 정보도 브라우저에 저장돼요. 브라우저 데이터를 지우면 새 익명 ID가 만들어지고, 그 전에 쓴 승인 대기 댓글은 보이지 않아요.",
      [ko.sections[5].body[0]]: "댓글과 기록은 Google의 Firebase(Cloud Firestore, 서울 리전)에 저장해요. 같은 내용을 쓰는 퓨처셀프 토스 미니앱, 안드로이드 앱과 함께 써요. 웹 버전은 GitHub Pages로 제공해서, 접속할 때 기기의 인터넷 주소(IP)가 GitHub에 전달될 수 있어요. 그 밖에는 개인정보를 다른 곳에 제공하거나 팔지 않아요.",
    },
  },
  en: {
    effective: "Effective November 20, 2026",
    lines: {
      [en.sections[0].body[2]]: null,
      [en.sections[1].body[0]]: "We use it to show comments, let the operator decide whether to publish them, show one person's comments with the same anonymous number, and prevent comment flooding.",
      [en.sections[3].body[1]]: "To delete all your comments, contact us at the email below.",
      [en.sections[4].body[0]]: "Your language, list sort, design, and home screen data are saved in your browser's storage so the page opens quickly next time. Firebase anonymous sign-in data is also kept in your browser. If you clear your browser data, a new anonymous ID is created and your earlier pending comments are no longer shown.",
      [en.sections[5].body[0]]: "Comments and notes are stored in Google's Firebase (Cloud Firestore, Seoul region), shared with the FutureSelf Toss mini app and Android app that show the same content. The web version is served by GitHub Pages, so your device's IP address may reach GitHub when you visit. We don't otherwise share or sell personal information.",
    },
  },
};

function forWeb(policy: Policy, { effective, lines }: (typeof WEB_LINES)[Language]): Policy {
  return {
    effective,
    sections: policy.sections.map((section) => ({
      ...section,
      body: section.body.map((line) => (line in lines ? lines[line] : line)).filter((line): line is string => line !== null),
    })),
  };
}

export const WEB_PRIVACY_POLICY: Record<Language, Policy> = { ko: forWeb(ko, WEB_LINES.ko), en: forWeb(en, WEB_LINES.en) };
