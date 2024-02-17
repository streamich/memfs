export const encode64 = (str: string) => Buffer.from(str).toString('base64');

export const decode64 = (str: string) => Buffer.from(str, 'base64').toString();
