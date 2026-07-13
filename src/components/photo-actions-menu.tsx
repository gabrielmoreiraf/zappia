"use client";

import { useState, type ReactNode } from "react";
import { Camera, Download, Eye, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function downloadPhoto(src: string, filename: string) {
  const a = document.createElement("a");
  a.href = src;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface PhotoActionsMenuProps {
  /** URL ou data URL da foto atual. null/undefined = ainda sem foto. */
  src: string | null | undefined;
  alt: string;
  /** Nome sugerido pro arquivo baixado. */
  filename: string;
  /** Abre o seletor de arquivo (trocar/enviar). */
  onPick: () => void;
  /** Omitido = esconde "Remover foto" no menu. */
  onRemove?: () => void;
  /** Mostrada no lugar de "Remover foto" quando a remoção não é possível. */
  removeDisabledReason?: string;
  /** Já existe um botão "Trocar foto" visível fora do menu? Some do menu pra não duplicar. */
  hideChangeInMenu?: boolean;
  /** A miniatura/avatar clicável. */
  children: ReactNode;
  className?: string;
}

/**
 * Envolve uma foto clicável. Sem foto ainda, o clique abre o seletor de
 * arquivo direto. Com foto, o clique abre um menu (ver, baixar, trocar,
 * remover).
 */
export function PhotoActionsMenu({
  src,
  alt,
  filename,
  onPick,
  onRemove,
  removeDisabledReason,
  hideChangeInMenu,
  children,
  className,
}: PhotoActionsMenuProps) {
  const [viewing, setViewing] = useState(false);

  if (!src) {
    return (
      <button type="button" onClick={onPick} className={className ?? "contents"}>
        {children}
      </button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={className ?? "contents"}>
            {children}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => setViewing(true)}>
            <Eye size={14} /> Ver foto
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadPhoto(src, filename)}>
            <Download size={14} /> Baixar foto
          </DropdownMenuItem>
          {!hideChangeInMenu && (
            <DropdownMenuItem onClick={onPick}>
              <Camera size={14} /> Trocar foto
            </DropdownMenuItem>
          )}
          {onRemove && (
            <DropdownMenuItem
              onClick={onRemove}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 size={14} /> Remover foto
            </DropdownMenuItem>
          )}
          {!onRemove && removeDisabledReason && (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
              {removeDisabledReason}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={viewing} onOpenChange={setViewing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="w-full rounded-xl" />
        </DialogContent>
      </Dialog>
    </>
  );
}
