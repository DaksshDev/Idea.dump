import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBi_tGV38fDntP7ji1nbTDqpqFbGQYq1OM",
  authDomain: "idea-dump-5a7fa.firebaseapp.com",
  projectId:"idea-dump-5a7fa",
};

// api keys kept hardcoded because this is a client side application and these keys are not secret. 
// They are used to identify the project and allow the app to connect to Firebase services.
//  In a production environment, you would typically use environment variables or a secure vault to manage sensitive information, 
// but for this example, hardcoding is acceptable.

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

