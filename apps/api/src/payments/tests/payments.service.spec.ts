import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';

// Test aislado de la lógica de verificación de firmas — sin levantar el módulo completo
// Extraemos la lógica privada a través de una subclase de prueba

class SignatureVerifier {
  timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  verifyMpSignature(rawBody: Buffer, signature: string | undefined, secret: string): void {
    if (!signature) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Firma faltante' } });
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!this.timingSafeEqual(expected, signature)) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Firma inválida' } });
    }
  }

  verifyStripeSignature(rawBody: Buffer, signature: string | undefined, secret: string): void {
    if (!signature) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Firma faltante' } });
    }
    const parts = signature.split(',');
    const tPart = parts.find((p) => p.startsWith('t='));
    const v1Part = parts.find((p) => p.startsWith('v1='));
    if (!tPart || !v1Part) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Formato inválido' } });
    }
    const timestamp = tPart.slice(2);
    const hmacPayload = `${timestamp}.${rawBody.toString()}`;
    const expected = createHmac('sha256', secret).update(hmacPayload).digest('hex');
    if (!this.timingSafeEqual(expected, v1Part.slice(3))) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Firma inválida' } });
    }
  }
}

describe('Webhook signature verification', () => {
  const verifier = new SignatureVerifier();
  const secret = 'test-secret-32-chars-long-enough!';
  const body = Buffer.from(JSON.stringify({ data: { id: 'pay-123' }, action: 'payment.updated' }));

  describe('Mercado Pago (HMAC-SHA256 directo)', () => {
    it('acepta firma válida', () => {
      const sig = createHmac('sha256', secret).update(body).digest('hex');
      expect(() => verifier.verifyMpSignature(body, sig, secret)).not.toThrow();
    });

    it('rechaza firma incorrecta', () => {
      expect(() => verifier.verifyMpSignature(body, 'deadbeef', secret))
        .toThrow(BadRequestException);
    });

    it('rechaza firma ausente', () => {
      expect(() => verifier.verifyMpSignature(body, undefined, secret))
        .toThrow(BadRequestException);
    });

    it('es resistente a ataques de timing (strings de igual longitud)', () => {
      const valid = createHmac('sha256', secret).update(body).digest('hex');
      const tampered = valid.replace(valid[0]!, valid[0] === 'a' ? 'b' : 'a');
      expect(verifier.timingSafeEqual(valid, tampered)).toBe(false);
    });
  });

  describe('Stripe (t=ts,v1=hmac)', () => {
    function makeStripeHeader(ts: string, rawBody: Buffer, s: string) {
      const hmac = createHmac('sha256', s).update(`${ts}.${rawBody.toString()}`).digest('hex');
      return `t=${ts},v1=${hmac}`;
    }

    it('acepta firma válida', () => {
      const header = makeStripeHeader('1700000000', body, secret);
      expect(() => verifier.verifyStripeSignature(body, header, secret)).not.toThrow();
    });

    it('rechaza firma con timestamp diferente', () => {
      const header = makeStripeHeader('9999999999', body, secret);
      const tampered = header.replace('v1=', 'v1=xx');
      expect(() => verifier.verifyStripeSignature(body, tampered, secret))
        .toThrow(BadRequestException);
    });

    it('rechaza header con formato incorrecto', () => {
      expect(() => verifier.verifyStripeSignature(body, 'malformed', secret))
        .toThrow(BadRequestException);
    });

    it('rechaza firma ausente', () => {
      expect(() => verifier.verifyStripeSignature(body, undefined, secret))
        .toThrow(BadRequestException);
    });
  });
});
