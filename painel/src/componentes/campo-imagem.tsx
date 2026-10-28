import { useRef, useState } from 'react';

import { mensagemErro } from '../lib/erros';
import { enviarImagem, urlImagem, type PastaImagem } from '../lib/imagens';
import { useAvisar } from './avisos';
import { Recortador } from './recortador';
import { Botao, Entrada } from './ui';

// Foto única (categoria, catálogo, banner, santo): enviar do computador
// (já reduzida e em WebP), arrastar o arquivo ou colar um link.
export function CampoImagem({
  valor,
  aoMudar,
  pasta,
  proporcao = '1 / 1',
  ladoMax,
  largura = 160,
}: {
  valor: string | null;
  aoMudar: (url: string | null) => void;
  pasta: PastaImagem;
  proporcao?: string;
  ladoMax?: number;
  largura?: number | string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [colando, setColando] = useState(false);
  const [aRecortar, setARecortar] = useState<File | null>(null);
  const avisar = useAvisar();

  // Foto escolhida: abre o recorte na proporção do campo. GIFs/SVG não passam por ele.
  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) return avisar('Escolha um arquivo de imagem (JPG, PNG ou WebP).', 'erro');
    setARecortar(arquivo);
  }

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviando(true);
    try {
      aoMudar(await enviarImagem(arquivo, pasta, ladoMax));
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pilha" style={{ gap: 8 }}>
      <div
        className={`zona-arquivo ${sobre ? 'sobre' : ''}`}
        style={{ padding: 0, width: largura, maxWidth: '100%', aspectRatio: proporcao, overflow: 'hidden', display: 'grid', placeItems: 'center' }}
        onClick={() => entrada.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobre(false);
          escolher(e.dataTransfer.files[0]);
        }}>
        {enviando ? (
          <span className="girando" />
        ) : valor ? (
          <img src={urlImagem(valor, 'grande')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="texto-2 pequeno" style={{ padding: 8 }}>
            Clique ou arraste uma foto
          </span>
        )}
      </div>
      <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => {
          escolher(e.target.files?.[0]);
          e.target.value = '';
        }} />
      {aRecortar ? (
        <Recortador
          arquivo={aRecortar}
          proporcao={proporcao}
          ladoMax={ladoMax ?? 1600}
          aoCancelar={() => setARecortar(null)}
          aoSemRecorte={() => {
            const original = aRecortar;
            setARecortar(null);
            enviar(original);
          }}
          aoConfirmar={(f) => {
            setARecortar(null);
            enviar(f);
          }}
        />
      ) : null}
      <div className="linha">
        <Botao pequeno onClick={() => entrada.current?.click()} carregando={enviando}>
          {valor ? 'Trocar foto' : 'Enviar foto'}
        </Botao>
        <Botao pequeno variante="fantasma" onClick={() => setColando((c) => !c)}>
          Colar link
        </Botao>
        {valor ? (
          <Botao pequeno variante="fantasma" onClick={() => aoMudar(null)}>
            Remover
          </Botao>
        ) : null}
      </div>
      {colando ? (
        <Entrada
          placeholder="https://..."
          defaultValue={valor ?? ''}
          onBlur={(e) => {
            const url = e.target.value.trim();
            if (url && url !== valor) aoMudar(url);
            setColando(false);
          }}
          autoFocus
        />
      ) : null}
    </div>
  );
}
