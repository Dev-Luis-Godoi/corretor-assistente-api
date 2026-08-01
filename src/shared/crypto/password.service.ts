import bcrypt from "bcryptjs";

export class PasswordService {
  constructor(private readonly saltRounds = 12) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
