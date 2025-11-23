const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.warn(`${colors.blue}[INFO]${colors.reset} ${message}`, ...args);
  },

  success: (message: string, ...args: unknown[]) => {
    console.warn(`${colors.green}[SUCCESS]${colors.reset} ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${message}`, ...args);
  },

  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`${colors.magenta}[DEBUG]${colors.reset} ${message}`, ...args);
    }
  },
};
