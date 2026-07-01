export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type ExpoPushClient = {
  send(messages: ExpoPushMessage[]): Promise<void>;
};

export function createNoopExpoPushClient(): ExpoPushClient {
  return {
    async send() {},
  };
}

export function createRecordingExpoPushClient(): ExpoPushClient & {
  messages: ExpoPushMessage[];
} {
  const messages: ExpoPushMessage[] = [];
  return {
    messages,
    async send(msgs) {
      messages.push(...msgs);
    },
  };
}

export function createExpoPushClient(): ExpoPushClient {
  return {
    async send(messages) {
      if (messages.length === 0) {
        return;
      }

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        throw new Error(`Expo push failed: ${response.status}`);
      }
    },
  };
}
