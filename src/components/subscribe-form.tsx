"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, CreditCard, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  subscribeWithPix,
  subscribeWithCard,
  getSubscriptionStatus,
} from "@/app/(app)/config/billing-actions";

type Method = "card" | "pix";
type PixData = { qrCodeImage: string; copyPaste: string };

/**
 * Formulário de assinatura (cartão + Pix) reaproveitado tanto no modal de
 * /config (assinatura já existente) quanto na página cheia /assinar (gate de
 * pagamento pro cliente novo, ver (app)/layout.tsx).
 */
export function SubscribeForm({
  defaultCpfCnpj,
  onActivated,
}: {
  defaultCpfCnpj: string | null;
  onActivated: () => void;
}) {
  const [method, setMethod] = useState<Method>("card");
  const [pending, start] = useTransition();
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [waitingConfirm, setWaitingConfirm] = useState(false);

  // Cartão
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState(defaultCpfCnpj ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");

  // Pix
  const [pixCpfCnpj, setPixCpfCnpj] = useState(defaultCpfCnpj ?? "");

  function submitCard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const res = await subscribeWithCard({
        cardNumber,
        holderName,
        expiryMonth,
        expiryYear,
        cvv,
        cpfCnpj,
        email,
        phone,
        postalCode,
        addressNumber,
      });
      if (res.ok) {
        toast.success("Cartão enviado! Confirmando o pagamento…");
        setWaitingConfirm(true);
      } else {
        toast.error(res.error ?? "Não foi possível processar o cartão.");
      }
    });
  }

  function submitPix(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const res = await subscribeWithPix(pixCpfCnpj);
      if (res.ok) {
        setPixData({ qrCodeImage: res.qrCodeImage, copyPaste: res.copyPaste });
        setWaitingConfirm(true);
      } else {
        toast.error(res.error ?? "Não foi possível gerar o Pix.");
      }
    });
  }

  usePollSubscriptionActive(waitingConfirm, () => {
    toast.success("Pagamento confirmado! Sua IA já está ativa.");
    setWaitingConfirm(false);
    onActivated();
  });

  if (pixData) {
    return <PixPanel data={pixData} waiting={waitingConfirm} />;
  }

  if (waitingConfirm) {
    return (
      <div className="py-10 flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600">
          Processando o pagamento… isso costuma levar só alguns segundos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <MethodTile
          icon={<CreditCard size={20} />}
          label="Cartão de crédito"
          selected={method === "card"}
          onClick={() => setMethod("card")}
        />
        <MethodTile
          icon={<QrCode size={20} />}
          label="Pix"
          selected={method === "pix"}
          onClick={() => setMethod("pix")}
        />
      </div>

      {method === "card" ? (
        <form onSubmit={submitCard} className="space-y-3 mt-3">
          <CardPreview
            number={cardNumber}
            name={holderName}
            month={expiryMonth}
            year={expiryYear}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="cardNumber">Número do cartão</Label>
            <Input
              id="cardNumber"
              autoComplete="cc-number"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="0000 0000 0000 0000"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="holderName">Nome no cartão</Label>
            <Input
              id="holderName"
              autoComplete="cc-name"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Como está no cartão"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="grid gap-1.5">
              <Label htmlFor="expMonth">Mês</Label>
              <Input
                id="expMonth"
                autoComplete="cc-exp-month"
                inputMode="numeric"
                maxLength={2}
                value={expiryMonth}
                onChange={(e) => setExpiryMonth(e.target.value)}
                placeholder="MM"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="expYear">Ano</Label>
              <Input
                id="expYear"
                autoComplete="cc-exp-year"
                inputMode="numeric"
                maxLength={4}
                value={expiryYear}
                onChange={(e) => setExpiryYear(e.target.value)}
                placeholder="AAAA"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                autoComplete="cc-csc"
                inputMode="numeric"
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                required
              />
            </div>
          </div>

          <p className="text-xs font-medium text-slate-500 pt-1">Dados de cobrança</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="grid gap-1.5">
              <Label htmlFor="cardCpf">CPF ou CNPJ</Label>
              <Input
                id="cardCpf"
                inputMode="numeric"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="Só números"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                autoComplete="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="DDD + número"
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="grid gap-1.5">
              <Label htmlFor="postalCode">CEP</Label>
              <Input
                id="postalCode"
                inputMode="numeric"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="00000-000"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="addressNumber">Número</Label>
              <Input
                id="addressNumber"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="Nº do endereço"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Processando…" : "Assinar com cartão"}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitPix} className="space-y-3 mt-3">
          <div className="grid gap-1.5">
            <Label htmlFor="pixCpf">CPF ou CNPJ</Label>
            <Input
              id="pixCpf"
              inputMode="numeric"
              value={pixCpfCnpj}
              onChange={(e) => setPixCpfCnpj(e.target.value)}
              placeholder="Só números"
              required
            />
            <p className="text-xs text-muted-foreground">
              Exigido pra emitir a cobrança. Você paga escaneando o QR Code na
              próxima tela.
            </p>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Gerando Pix…" : "Gerar Pix"}
          </Button>
        </form>
      )}
    </>
  );
}

function MethodTile({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3.5 flex flex-col items-center gap-1.5 text-sm font-medium transition-colors ${
        selected
          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
          : "border-slate-200 text-slate-500 hover:border-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CardPreview({
  number,
  name,
  month,
  year,
}: {
  number: string;
  name: string;
  month: string;
  year: string;
}) {
  const digits = number.replace(/\D/g, "").padEnd(16, "•");
  const groups = digits.match(/.{1,4}/g) ?? [];
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-4 h-32 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between">
        <div className="w-8 h-6 rounded bg-white/25" />
        <CreditCard size={20} className="opacity-70" />
      </div>
      <div className="font-mono text-lg tracking-wider">
        {groups.slice(0, 4).join(" ")}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase truncate max-w-[70%]">
          {name || "NOME NO CARTÃO"}
        </span>
        <span className="font-mono">
          {(month || "MM").padStart(2, "0")}/{(year || "AAAA").slice(-2)}
        </span>
      </div>
    </div>
  );
}

function PixPanel({ data, waiting }: { data: PixData; waiting: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(data.copyPaste).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <img
        src={`data:image/png;base64,${data.qrCodeImage}`}
        alt="QR Code Pix"
        className="w-48 h-48 rounded-lg border border-slate-100"
      />
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copiado!" : "Copiar código Pix"}
      </button>
      <p className="text-xs text-slate-500 text-center max-w-xs">
        Escaneie com o app do seu banco ou cole o código copiado.
      </p>
      {waiting && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
          <div className="w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
          Aguardando confirmação do pagamento…
        </div>
      )}
    </div>
  );
}

/** Consulta o status a cada 3s enquanto `active` for true; chama onActive() quando confirmar. */
function usePollSubscriptionActive(active: boolean, onActive: () => void) {
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(async () => {
      const res = await getSubscriptionStatus();
      if (res?.status === "active") {
        clearInterval(id);
        onActiveRef.current();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [active]);
}
