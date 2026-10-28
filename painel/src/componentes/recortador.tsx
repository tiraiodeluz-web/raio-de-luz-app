import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Botao } from './ui';

// Recorte da foto antes de enviar: arraste pra enquadrar e use o zoom.
// O recorte sai na proporção do campo (banner 2:1, capa 5:7, kit 1:1...).
export function lerProporcao(proporcao: string): number {
  const [a, b] = proporcao.split('/').map((n) => Number(n.trim()));
  return a > 0 && b > 0 ? a / b : 1;
}

const LARGURA_MAX = 460;
const ALTURA_MAX = 460;

export function Recortador({
  arquivo,
  proporcao,
  ladoMax,
  aoConfirmar,
  aoCancelar,
  aoSemRecorte,
}: {
  arquivo: File;
  proporcao: string;
  ladoMax: number;
  aoConfirmar: (recortado: File) => void;
  aoCancelar: () => void;
  aoSemRecorte: () => void;
}) {
  const razao = lerProporcao(proporcao);
  const largura = Math.min(LARGURA_MAX, ALTURA_MAX * razao);
  const altura = largura / razao;

  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // canto superior esquerdo da foto dentro da moldura
  const [gerando, setGerando] = useState(false);
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  const base = natural ? Math.max(largura / natural.w, altura / natural.h) : 1;
  const escala = base * zoom;

  // Mantém a foto sempre cobrindo toda a moldura.
  const limitar = (x: number, y: number, esc: number) => {
    if (!natural) return { x, y };
    return {
      x: Math.min(0, Math.max(largura - natural.w * esc, x)),
      y: Math.min(0, Math.max(altura - natural.h * esc, y)),
    };
  };

  function aoCarregar(img: HTMLImageElement) {
    const n = { w: img.naturalWidth, h: img.naturalHeight };
    const b = Math.max(largura / n.w, altura / n.h);
    setNatural(n);
    setPos({ x: (largura - n.w * b) / 2, y: (altura - n.h * b) / 2 });
  }

  function mudarZoom(novo: number) {
    if (!natural) return;
    const z = Math.min(4, Math.max(1, novo));
    const novaEscala = base * z;
    // Zoom em torno do centro da moldura.
    const cx = (largura / 2 - pos.x) / escala;
    const cy = (altura / 2 - pos.y) / escala;
    setZoom(z);
    setPos(limitar(largura / 2 - cx * novaEscala, altura / 2 - cy * novaEscala, novaEscala));
  }

  async function confirmar() {
    if (!natural || !url) return;
    setGerando(true);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const sx = -pos.x / escala;
      const sy = -pos.y / escala;
      const sw = largura / escala;
      const sh = altura / escala;
      const saida = Math.min(1, ladoMax / Math.max(sw, sh));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw * saida);
      canvas.height = Math.round(sh * saida);
      canvas.getContext('2d')?.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.88));
      if (!blob) throw new Error('Não foi possível recortar a imagem');
      aoConfirmar(new File([blob], 'recorte.webp', { type: 'image/webp' }));
    } finally {
      setGerando(false);
    }
  }

  return createPortal(
    <div className="modal-fundo" style={{ zIndex: 300, alignItems: 'center' }}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: largura + 48 }}>
        <div className="modal-cabecalho">
          <h2>Recortar foto</h2>
        </div>
        <div className="modal-corpo" style={{ alignItems: 'center' }}>
          <div
            style={{ width: largura, height: altura, overflow: 'hidden', position: 'relative', background: '#222', borderRadius: 8, touchAction: 'none', cursor: 'grab', margin: '0 auto' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              arrasto.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
            }}
            onPointerMove={(e) => {
              const a = arrasto.current;
              if (!a) return;
              setPos(limitar(a.x + e.clientX - a.px, a.y + e.clientY - a.py, escala));
            }}
            onPointerUp={() => (arrasto.current = null)}
            onWheel={(e) => mudarZoom(zoom - e.deltaY * 0.002)}>
            {url ? (
              <img
                src={url}
                alt=""
                draggable={false}
                onLoad={(e) => aoCarregar(e.currentTarget)}
                style={{ position: 'absolute', left: pos.x, top: pos.y, width: natural ? natural.w * escala : undefined, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' }}
              />
            ) : null}
          </div>
          <label className="linha" style={{ gap: 10, marginTop: 12, justifyContent: 'center' }}>
            <span className="texto-2 pequeno">Zoom</span>
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => mudarZoom(Number(e.target.value))} style={{ width: 220 }} />
          </label>
          <p className="texto-2 pequeno" style={{ textAlign: 'center', marginTop: 8 }}>
            Arraste a foto pra enquadrar. O que ficar dentro da moldura é o que vai pro app.
          </p>
        </div>
        <div className="modal-rodape">
          <Botao variante="fantasma" onClick={aoSemRecorte} style={{ marginRight: 'auto' }}>
            Usar sem recortar
          </Botao>
          <Botao onClick={aoCancelar}>Cancelar</Botao>
          <Botao variante="primario" onClick={confirmar} carregando={gerando} disabled={!natural}>
            Recortar e usar
          </Botao>
        </div>
      </div>
    </div>,
    document.body,
  );
}
