import { env } from "@/config/env.js";
import { AppError } from "@/shared/errors/app-error.js";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export class ResendEmailService {
  async sendPasswordReset(input: { email: string; name: string; token: string; idempotencyKey: string }) {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) throw new AppError("Email service is not configured", 503, "EMAIL_SERVICE_UNAVAILABLE");
    const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(input.token)}`;
    const safeName = escapeHtml(input.name);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
        "User-Agent": "corretor-assistente-api/1.0",
      },
      body: JSON.stringify({
        from: `Corretor Assistente <${env.RESEND_FROM_EMAIL}>`,
        to: [input.email],
        subject: "Redefinição de senha — Corretor Assistente",
        text: `Olá, ${input.name}. Redefina sua senha em até 30 minutos: ${resetUrl}. Se você não solicitou, ignore este e-mail.`,
        html: `<div style="font-family:Arial,sans-serif;color:#111827"><h2>Redefinição de senha</h2><p>Olá, ${safeName}.</p><p>Use o botão abaixo para definir uma nova senha. O link expira em 30 minutos e só pode ser usado uma vez.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:600">Redefinir senha</a></p><p>Se você não solicitou esta alteração, ignore este e-mail.</p></div>`,
        tags: [{ name: "category", value: "password_reset" }],
      }),
    });
    if (!response.ok) throw new AppError("Unable to send password reset email", 502, "EMAIL_DELIVERY_FAILED");
  }
}
