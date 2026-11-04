interface ConsentChoice {
  analytics: boolean;
  ads: boolean;
  at?: number;
}

interface Window {
  siteConsent: {
    choice: ConsentChoice | null;
    save(choice: ConsentChoice): void;
  };
}
