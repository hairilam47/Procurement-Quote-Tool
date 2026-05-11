declare global {
  namespace Express {
    interface Request {
      userId: string;
      subscriptionActive?: boolean;
    }
  }
}

export {};
