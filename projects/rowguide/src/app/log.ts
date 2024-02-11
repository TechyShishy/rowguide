export class Log {
  static loglevel = 2;
  static log(message: string) {
    console.log(message);
  }

  static fatal(...message: any[]) {
    if (Log.loglevel > 0) {
      console.log('[FATAL]: %s', ...message);
      process.exit(1);
    }
  }
  static error(...message: any[]) {
    if (Log.loglevel > 1) {
      console.log('[ERROR]: %s', ...message);
    }
  }
  static warn(...message: any[]) {
    if (Log.loglevel > 2) {
      console.log('[WARNING]: %s', ...message);
    }
  }
  static info(...message: any[]) {
    if (Log.loglevel > 3) {
      console.log('[INFO]: %s', ...message);
    }
  }
  static debug(...message: any[]) {
    if (Log.loglevel > 4) {
      console.log('[DEBUG]: %s', ...message);
    }
  }
}
