/* Study Coffee — configuração pública do site (pode ficar no repositório; não há segredo aqui). */
window.SC_CONFIG = {
  /* Supabase → Project Settings → API */
  supabaseUrl: 'https://mcpffjkyngnwscdxqrrf.supabase.co',
  supabaseAnonKey: 'sb_publishable_ywxWfGsHcoKU99Q4GKbTzQ_5mVR_lcw',

  /* WhatsApp do Arthur para o aluno mandar o comprovante no Pix manual: DDI+DDD+número, só dígitos (ex.: 5511999998888). Vazio esconde o botão. */
  whatsapp: '',

  /* Pix manual (usado só enquanto o Mercado Pago não estiver configurado): chave aleatória do Arthur. */
  pix: { key: '27e680f4-fae4-4a5f-965d-a4db13d98c59', name: 'Arthur Cavalcante', city: 'BRASIL', amount: '10.00' }
};
