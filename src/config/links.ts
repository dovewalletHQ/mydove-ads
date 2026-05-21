export interface AppLinks {
  ios: string;
  android: string;
  fallback: string;
}

// Replace these with your actual store URLs
const appLinks: AppLinks = {
  ios: "https://apps.apple.com/app/your-app/id000000000",
  android: "https://play.google.com/store/apps/details?id=com.mydove.app",
  fallback: "https://yourwebsite.com/download",
};

export default appLinks;
