/**
 * Zappia — seed de desenvolvimento (Fase 2).
 *
 * Popula um client de teste (Daniel — Cursos) com a base de cursos do protótipo,
 * conversas, leads e uso — além de 2 clients extras para o painel da agência.
 *
 * Opção A (escolha do cliente): não temos a lista real de cursos ainda, então
 * TODOS os cursos entram com `status: confirmar_com_equipe` e SEM valor — a IA
 * nunca vai afirmar preço até a base real ser cadastrada (regra de ouro §prompt).
 *
 * ⚠️  Dev only: apaga os dados das tabelas antes de inserir. Precisa de
 * DATABASE_URL válido no .env.local. Rode com:  npm run db:seed
 */
import { config } from "dotenv";

// Carrega env ANTES de importar o client do banco (que exige DATABASE_URL).
config({ path: ".env.local" });
config();

import bcrypt from "bcryptjs";

/**
 * Base de conhecimento do Daniel em Markdown estruturado (§3 do prompt mestre).
 * Extensão mínima: incluímos `ativo:` por item para o editor de Cursos (§4.6)
 * fazer round-trip; o builder do prompt (Fase 3) ignora itens `ativo: false`.
 */
const danielKnowledgeBase = `### Instrumentação Cirúrgica
- status: confirmar_com_equipe
- categoria: Presencial
- carga_horária: a confirmar
- observação: vagas limitadas
- ativo: true

### Injetáveis
- status: confirmar_com_equipe
- categoria: Presencial
- carga_horária: a confirmar
- ativo: true

### Cuidador de Idosos
- status: confirmar_com_equipe
- categoria: Presencial
- carga_horária: a confirmar
- ativo: true

### Técnico em Enfermagem
- status: confirmar_com_equipe
- categoria: Técnico
- carga_horária: a confirmar
- observação: semi-presencial, parceria com Instituto Phillium
- ativo: true

### Técnico em Saúde Bucal
- status: confirmar_com_equipe
- categoria: Técnico
- carga_horária: a confirmar
- observação: semi-presencial
- ativo: false

### Graduação e Pós (+400 cursos)
- status: confirmar_com_equipe
- categoria: EAD
- carga_horária: a confirmar
- observação: Polo UNIFATECIE — encaminhar para matrícula
- ativo: true

### Conclusão do Ensino Médio
- status: confirmar_com_equipe
- categoria: EAD
- carga_horária: a confirmar
- ativo: true
`;

// helpers de data (relativos a agora)
const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

async function main() {
  const { db } = await import("./index");
  const s = await import("./schema");

  console.log("→ limpando tabelas (dev seed)…");
  // ordem segura em relação às FKs
  await db.delete(s.leads);
  await db.delete(s.messages);
  await db.delete(s.usageLog);
  await db.delete(s.conversations);
  await db.delete(s.agencyUsers);
  await db.delete(s.clients);

  console.log("→ agency_users…");
  await db.insert(s.agencyUsers).values({
    email: "owner@zappia.app",
    passwordHash: bcrypt.hashSync("zappia123", 10),
    role: "owner",
  });

  console.log("→ clients…");
  const [daniel] = await db
    .insert(s.clients)
    .values({
      name: "Daniel — Cursos",
      ownerEmail: "daniel@zappia.app",
      businessDescription:
        "Escola de cursos: presenciais (área da saúde), técnicos semi-presenciais e graduação/pós EAD (Polo UNIFATECIE).",
      whatsappNumber: "+55 85 90000-0021",
      whatsappPhoneId: "PENDENTE_DANIEL", // preenchido ao conectar o número real (Fase 5)
      assistantName: "Atendimento Cursos",
      tone: "Amigável",
      welcomeMessage:
        "Olá! 👋 Seja bem-vindo(a). Pode mandar por texto ou áudio — me conta qual curso te interessou?",
      handoffTriggers: [
        "preço",
        "quero falar com atendente",
        "não entendi",
        "reclamação",
      ],
      knowledgeBase: danielKnowledgeBase,
      plan: "pro",
      monthlyFee: "250.00",
      status: "active",
      createdAt: daysAgo(40),
    })
    .returning();

  // Clients extras (painel da agência, Fase 6) — sem base/conversas detalhadas.
  await db.insert(s.clients).values([
    {
      name: "Gabriel — Depósito",
      ownerEmail: "gabriel@zappia.app",
      businessDescription: "Depósito de materiais de construção.",
      whatsappNumber: "+55 85 90000-0031",
      whatsappPhoneId: "PENDENTE_GABRIEL",
      assistantName: "Atendimento Depósito",
      tone: "Amigável",
      welcomeMessage: "Opa! Bem-vindo. Me diz o que você tá precisando 👍",
      handoffTriggers: ["preço", "orçamento", "reclamação"],
      knowledgeBase: "",
      plan: "pro",
      monthlyFee: "250.00",
      status: "active",
      createdAt: daysAgo(25),
    },
    {
      name: "Clínica Vida",
      ownerEmail: "contato@clinicavida.app",
      businessDescription: "Clínica — agendamento de consultas.",
      whatsappNumber: "+55 85 90000-0041",
      whatsappPhoneId: "PENDENTE_CLINICA",
      assistantName: "Recepção Vida",
      tone: "Neutro",
      welcomeMessage: "Olá! Como posso ajudar com seu agendamento?",
      handoffTriggers: ["remarcar", "reclamação"],
      knowledgeBase: "",
      plan: "start",
      monthlyFee: "250.00",
      status: "active",
      createdAt: daysAgo(10),
    },
  ]);

  console.log("→ conversations + messages (Daniel)…");

  // 1) Marcos Vinícius — IA respondendo
  const [convMarcos] = await db
    .insert(s.conversations)
    .values({
      clientId: daniel.id,
      contactName: "Marcos Vinícius",
      contactPhone: "+5585990001001",
      status: "ia",
      lastMessageAt: hoursAgo(1),
      unreadCount: 0,
    })
    .returning();
  await db.insert(s.messages).values([
    {
      conversationId: convMarcos.id,
      from: "them",
      isAudio: true,
      text: "Oi, boa tarde! Vi o anúncio de vocês, queria saber quanto custa a graduação em pedagogia a distância.",
      courseMentioned: "Graduação e Pós (+400 cursos)",
      createdAt: hoursAgo(1.2),
    },
    {
      conversationId: convMarcos.id,
      from: "bot",
      text: "Boa tarde, Marcos! 😊 Que bom seu interesse. A graduação em Pedagogia EAD é pelo Polo UNIFATECIE — te passo o valor e o link de matrícula. Você já tem alguma graduação anterior?",
      confidence: "alta",
      createdAt: hoursAgo(1.1),
    },
    {
      conversationId: convMarcos.id,
      from: "them",
      text: "Não, seria a primeira.",
      createdAt: hoursAgo(1.05),
    },
    {
      conversationId: convMarcos.id,
      from: "bot",
      text: "Perfeito! Nesse caso entra como primeira graduação. Posso te enviar o link pra você garantir a vaga? As turmas estão com vagas limitadas.",
      confidence: "alta",
      createdAt: hoursAgo(1),
    },
  ]);

  // 2) Juliana Alves — encaminhada (novo)
  const [convJuliana] = await db
    .insert(s.conversations)
    .values({
      clientId: daniel.id,
      contactName: "Juliana Alves",
      contactPhone: "+5585990001002",
      status: "novo",
      lastMessageAt: hoursAgo(1.4),
      unreadCount: 2,
    })
    .returning();
  await db.insert(s.messages).values([
    {
      conversationId: convJuliana.id,
      from: "them",
      isAudio: true,
      text: "Oi! O curso de instrumentação cirúrgica é presencial? Tem turma esse mês?",
      courseMentioned: "Instrumentação Cirúrgica",
      createdAt: hoursAgo(1.5),
    },
    {
      conversationId: convJuliana.id,
      from: "bot",
      text: "Oi, Juliana! Sim, Instrumentação Cirúrgica é presencial. Deixa eu confirmar a próxima turma com a equipe e já te retorno o valor certinho. 🙌",
      confidence: "baixa",
      createdAt: hoursAgo(1.4),
    },
  ]);

  // 3) Pedro Henrique — assumida por você (voce)
  const [convPedro] = await db
    .insert(s.conversations)
    .values({
      clientId: daniel.id,
      contactName: "Pedro Henrique",
      contactPhone: "+5585990001003",
      status: "voce",
      lastMessageAt: hoursAgo(3),
      unreadCount: 0,
    })
    .returning();
  await db.insert(s.messages).values([
    {
      conversationId: convPedro.id,
      from: "them",
      text: "Qual a diferença entre o técnico em enfermagem semi e o presencial?",
      courseMentioned: "Técnico em Enfermagem",
      createdAt: hoursAgo(3.4),
    },
    {
      conversationId: convPedro.id,
      from: "bot",
      text: "Ótima pergunta! O Técnico em Enfermagem é semi-presencial, em parceria com o Instituto Phillium — teoria online e práticas presenciais.",
      confidence: "alta",
      createdAt: hoursAgo(3.3),
    },
    {
      conversationId: convPedro.id,
      from: "you",
      text: "Oi Pedro, aqui é o Daniel. Posso te ligar pra explicar melhor as datas?",
      createdAt: hoursAgo(3.1),
    },
    {
      conversationId: convPedro.id,
      from: "them",
      text: "Beleza, vou pensar e te falo!",
      createdAt: hoursAgo(3),
    },
  ]);

  // 4) Camila Souza — matriculada (ia)
  const [convCamila] = await db
    .insert(s.conversations)
    .values({
      clientId: daniel.id,
      contactName: "Camila Souza",
      contactPhone: "+5585990001004",
      status: "ia",
      lastMessageAt: hoursAgo(26),
      unreadCount: 0,
    })
    .returning();
  await db.insert(s.messages).values([
    {
      conversationId: convCamila.id,
      from: "them",
      text: "Consegui, obrigada! Já me matriculei 🎉",
      courseMentioned: "Técnico em Enfermagem",
      createdAt: hoursAgo(26.1),
    },
    {
      conversationId: convCamila.id,
      from: "bot",
      text: "Que notícia boa, Camila! 🎉 Seja muito bem-vinda. Qualquer dúvida na plataforma é só chamar aqui.",
      confidence: "alta",
      createdAt: hoursAgo(26),
    },
  ]);

  console.log("→ leads (Daniel)…");
  await db.insert(s.leads).values([
    {
      clientId: daniel.id,
      conversationId: convMarcos.id,
      contactName: "Marcos Vinícius",
      courseInterest: "Pedagogia EAD",
      channel: "anuncio",
      status: "novo",
      createdAt: hoursAgo(1.2),
    },
    {
      clientId: daniel.id,
      conversationId: convJuliana.id,
      contactName: "Juliana Alves",
      courseInterest: "Instrumentação Cirúrgica",
      channel: "anuncio",
      status: "contato",
      createdAt: hoursAgo(1.5),
    },
    {
      clientId: daniel.id,
      conversationId: convCamila.id,
      contactName: "Camila Souza",
      courseInterest: "Técnico em Enfermagem",
      channel: "organico",
      status: "matriculado",
      createdAt: daysAgo(1),
    },
    {
      clientId: daniel.id,
      contactName: "Rafael Lima",
      courseInterest: "Excel Avançado",
      channel: "anuncio",
      status: "contato",
      createdAt: daysAgo(1),
    },
    {
      clientId: daniel.id,
      contactName: "Beatriz Rocha",
      courseInterest: "Cuidador de Idosos",
      channel: "organico",
      status: "novo",
      createdAt: daysAgo(2),
    },
  ]);

  console.log("→ usage_log (Daniel, últimos 7 dias)…");
  const usage = [60, 72, 48, 84, 95, 40, 28]; // conversas/dia (protótipo)
  await db.insert(s.usageLog).values(
    usage.map((conversas, i) => ({
      clientId: daniel.id,
      tokensIn: conversas * 1200,
      tokensOut: conversas * 300,
      audioSeconds: conversas * 4,
      whatsappMessages: conversas * 3,
      createdAt: daysAgo(6 - i),
    })),
  );

  console.log("\n✓ Seed concluído.");
  console.log("  Agência (login): owner@zappia.app / zappia123");
  console.log("  Client de teste: Daniel — Cursos (7 cursos, 4 conversas, 5 leads)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed falhou:", err);
    process.exit(1);
  });
