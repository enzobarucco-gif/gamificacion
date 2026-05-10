import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress = config.get('SMTP_FROM', 'PGD <noreply@pgd.dev>');
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'localhost'),
      port: config.get<number>('SMTP_PORT', 1025),
      secure: false,
      ignoreTLS: true,
    });
  }

  async sendEmailVerification(to: string, nombre: string, token: string): Promise<void> {
    const appUrl = this.config.get('API_BASE_URL', 'http://localhost:3001');
    const link = `${appUrl}/api/v1/auth/email/verify?token=${token}`;
    await this.send(to, 'Verificá tu email — PGD', this.verifyTemplate(nombre, link));
  }

  async sendPasswordReset(to: string, nombre: string, token: string): Promise<void> {
    const webUrl = this.config.get('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const link = `${webUrl}/auth/password/reset?token=${token}`;
    await this.send(to, 'Restablecé tu contraseña — PGD', this.resetTemplate(nombre, link));
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject, html });
    } catch (err) {
      // No interrumpir el flujo si el email falla — solo logueamos
      this.logger.warn(`Error al enviar email a ${to}: ${String(err)}`);
    }
  }

  private verifyTemplate(nombre: string, link: string): string {
    return `<p>Hola ${nombre},</p><p>Verificá tu email haciendo clic en el siguiente enlace:</p><p><a href="${link}">${link}</a></p><p>El enlace expira en 24 horas.</p>`;
  }

  private resetTemplate(nombre: string, link: string): string {
    return `<p>Hola ${nombre},</p><p>Recibiste esta solicitud para restablecer tu contraseña. Hacé clic en el enlace:</p><p><a href="${link}">${link}</a></p><p>El enlace expira en 1 hora. Si no solicitaste esto, ignorá este email.</p>`;
  }
}
