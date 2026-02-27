import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBi_tGV38fDntP7ji1nbTDqpqFbGQYq1OM",
  authDomain: "idea-dump-5a7fa.firebaseapp.com",
  projectId:"idea-dump-5a7fa",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

