# Segurança e privacidade

## Segredos

- Nunca versionar `.env`, chaves da Evolution API, Resend, JWT ou segredo do webhook.
- Usar segredos diferentes por ambiente, com no mínimo 32 caracteres, e rotacioná-los periodicamente.
- Em produção, armazenar segredos em um cofre gerenciado e exigir HTTPS em todas as integrações.

## Dados pessoais e LGPD

- Telefones, nomes, e-mails e conteúdo de mensagens são dados pessoais e devem ter finalidade e base legal documentadas.
- Contratos com Evolution API, hospedagem, banco e Resend devem definir papéis de operador/suboperador, segurança, retenção, transferência internacional e exclusão.
- Definir política de retenção para mensagens, leads, logs e backups; excluir dados quando a finalidade terminar.
- Disponibilizar processos de confirmação de tratamento, acesso, correção, portabilidade, oposição e eliminação quando aplicável.
- Manter registro das operações de tratamento, plano de resposta a incidentes e contato do encarregado.

## Salvaguardas implementadas

- JWT somente em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Isolamento de dados por `organizationId` nas consultas autenticadas.
- Webhook Evolution autenticado por segredo dedicado e comparação resistente a timing.
- Payload do webhook limitado a 256 KiB, validado com Zod e mensagens de grupo ignoradas.
- Idempotência de mensagens pelo identificador externo da Evolution API.
- Tokens de recuperação aleatórios, armazenados apenas como SHA-256, com uso único e expiração em 30 minutos.
- Resend com chave de idempotência, versão texto e HTML escapado.
- Chaves de provedores permanecem somente no backend.
- Conteúdo de mensagens e segredos não são registrados explicitamente nos logs da aplicação.

## Pendências operacionais

- Substituir o rate limiting em memória por uma implementação distribuída no
  proxy/API gateway (Redis, WAF ou equivalente) antes de operar com múltiplas instâncias.
- Definir retenção automática e rotina auditada de descarte de dados e backups.
- Configurar monitoramento de incidentes, alertas e trilha de auditoria administrativa.
- Realizar RIPD quando o tratamento apresentar alto risco e revisão jurídica antes da produção.

Referências: Guia de Segurança da Informação da ANPD e documentação oficial da Evolution API e Resend.
