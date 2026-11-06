import { useMemo, useRef, useState } from 'react';

import { useAvisar } from '../componentes/avisos';
import { Botao, CabecalhoPagina, Campo, Cartao } from '../componentes/ui';

// Gera e pré-visualiza o ícone do app (e os ícones de notificação e abertura).
// O ícone na tela do celular é parte do aplicativo instalado: trocar exige um
// build novo. Esta tela monta os arquivos prontos no formato certo e mostra
// como ficam; depois é só colocá-los em assets/images/ e gerar o build.

const CANVAS = 1024;

type Arquivo = { nome: string; descricao: string; url: string };

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error('Não foi possível abrir a imagem'));
    img.src = url;
  });
}

function novaTela(lado: number) {
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  return { canvas, ctx: canvas.getContext('2d') as CanvasRenderingContext2D };
}

// Desenha a logo centralizada, "contida" num quadrado de lado = lado * escala.
function desenharLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, lado: number, escala: number) {
  const caixa = lado * escala;
  const razao = Math.min(caixa / logo.naturalWidth, caixa / logo.naturalHeight);
  const w = logo.naturalWidth * razao;
  const h = logo.naturalHeight * razao;
  ctx.drawImage(logo, (lado - w) / 2, (lado - h) / 2, w, h);
}

function silhueta(logo: HTMLImageElement, lado: number, escala: number, cor = '#ffffff') {
  const { canvas, ctx } = novaTela(lado);
  desenharLogo(ctx, logo, lado, escala);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, lado, lado);
  return canvas;
}

function temFundoTransparente(logo: HTMLImageElement): boolean {
  const { canvas, ctx } = novaTela(64);
  ctx.drawImage(logo, 0, 0, 64, 64);
  const cantos = [ctx.getImageData(0, 0, 1, 1), ctx.getImageData(63, 0, 1, 1), ctx.getImageData(0, 63, 1, 1), ctx.getImageData(63, 63, 1, 1)];
  void canvas;
  return cantos.some((c) => c.data[3] < 250);
}

const paraUrl = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/png');

export function PaginaIcone() {
  const avisar = useAvisar();
  const entrada = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [cor, setCor] = useState('#010534');
  const [escala, setEscala] = useState(58);
  const [avisoFundo, setAvisoFundo] = useState(false);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) return avisar('Escolha uma imagem (PNG de preferência).', 'erro');
    try {
      const img = await carregarImagem(URL.createObjectURL(arquivo));
      setLogo(img);
      setAvisoFundo(!temFundoTransparente(img));
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Imagem inválida', 'erro');
    }
  }

  const arquivos = useMemo<Arquivo[] | null>(() => {
    if (!logo) return null;
    const e = escala / 100;

    const fundo = novaTela(CANVAS);
    fundo.ctx.fillStyle = cor;
    fundo.ctx.fillRect(0, 0, CANVAS, CANVAS);

    const frente = novaTela(CANVAS);
    desenharLogo(frente.ctx, logo, CANVAS, e);

    // icon.png (iOS / loja): sem transparência, logo um pouco maior
    const completo = novaTela(CANVAS);
    completo.ctx.drawImage(fundo.canvas, 0, 0);
    desenharLogo(completo.ctx, logo, CANVAS, Math.min(0.9, e * 1.35));

    const playStore = novaTela(512);
    playStore.ctx.drawImage(completo.canvas, 0, 0, 512, 512);

    return [
      { nome: 'icon.png', descricao: 'Ícone geral (1024×1024, sem transparência)', url: paraUrl(completo.canvas) },
      { nome: 'android-icon-foreground.png', descricao: 'Android: frente do ícone adaptativo (transparente)', url: paraUrl(frente.canvas) },
      { nome: 'android-icon-background.png', descricao: 'Android: fundo do ícone adaptativo', url: paraUrl(fundo.canvas) },
      { nome: 'android-icon-monochrome.png', descricao: 'Android 13+: ícone monocromático (cor do tema)', url: paraUrl(silhueta(logo, CANVAS, e, '#ffffff')) },
      { nome: 'notification-icon.png', descricao: 'Ícone pequeno da notificação (192×192, branco)', url: paraUrl(silhueta(logo, 192, 0.86)) },
      { nome: 'splash-icon.png', descricao: 'Abertura do app (1152×1152, branco)', url: paraUrl(silhueta(logo, 1152, 0.6)) },
      { nome: 'icone-play-store-512.png', descricao: 'Ficha da Play Store (512×512)', url: paraUrl(playStore.canvas) },
    ];
  }, [logo, cor, escala]);

  const [completoUrl, frenteUrl, fundoUrl, monoUrl, notifUrl, splashUrl] = arquivos?.map((a) => a.url) ?? [];

  function baixar(a: Arquivo) {
    const link = document.createElement('a');
    link.href = a.url;
    link.download = a.nome;
    link.click();
  }

  async function baixarTodos() {
    for (const a of arquivos ?? []) {
      baixar(a);
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Ícone do app"
        descricao="Escolha a logo, veja como fica no celular e baixe os arquivos prontos. O ícone faz parte do aplicativo instalado: depois de trocar, é preciso gerar uma versão nova do app."
      />
      <div className="grade grade-2" style={{ alignItems: 'start' }}>
        <Cartao titulo="1. Logo e cores">
          <div className="pilha" style={{ gap: 14 }}>
            <Campo rotulo="Logo (PNG com fundo transparente, ideal 1024×1024)">
              <div className="linha">
                <Botao onClick={() => entrada.current?.click()}>{logo ? 'Trocar logo' : 'Escolher logo'}</Botao>
              </div>
              <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => escolher(e.target.files?.[0])} />
            </Campo>
            {avisoFundo ? (
              <div className="caixa-erro">
                Essa imagem parece ter fundo (não é transparente). O ícone monocromático e o da notificação ficariam como um quadrado cheio. Use um PNG com fundo
                transparente.
              </div>
            ) : null}
            <Campo rotulo="Cor de fundo do ícone">
              <div className="linha" style={{ gap: 10 }}>
                <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} style={{ width: 48, height: 36, border: 0, background: 'none' }} />
                <span className="texto-2">{cor.toUpperCase()}</span>
              </div>
            </Campo>
            <Campo rotulo={`Tamanho da logo no ícone: ${escala}%`} ajuda="Se a logo encostar na borda dos círculos da prévia, diminua.">
              <input type="range" min={40} max={80} value={escala} onChange={(e) => setEscala(Number(e.target.value))} style={{ width: '100%' }} />
            </Campo>
          </div>
        </Cartao>

        <Cartao titulo="2. Como fica">
          {!arquivos ? (
            <p className="texto-2">Escolha uma logo para ver a prévia.</p>
          ) : (
            <div className="pilha" style={{ gap: 22 }}>
              <div>
                <strong className="pequeno">Formatos de ícone (varia por marca do celular)</strong>
                <div className="linha" style={{ gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
                  {[
                    ['Círculo', '50%'],
                    ['Arredondado', '24%'],
                    ['Quadrado suave', '14%'],
                  ].map(([nome, raio]) => (
                    <div key={nome} style={{ textAlign: 'center' }}>
                      <AdaptativoPrevia fundo={fundoUrl} frente={frenteUrl} lado={84} raio={raio} />
                      <div className="texto-3 pequeno" style={{ marginTop: 4 }}>
                        {nome}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <strong className="pequeno">Na tela inicial do celular</strong>
                <div style={{ marginTop: 10, background: 'linear-gradient(160deg,#2b5876,#4e4376)', borderRadius: 20, padding: 18, maxWidth: 330 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, justifyItems: 'center' }}>
                    {['Telefone', 'Câmera', 'Galeria', 'Relógio', 'Mensagens', 'Config.', 'Spotify'].map((n, i) => (
                      <div key={n} style={{ textAlign: 'center', width: 60 }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: ['#34a853', '#757575', '#e040fb', '#9e9e9e', '#4285f4', '#546e7a', '#1db954'][i], margin: '0 auto' }} />
                        <div style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>{n}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'center', width: 60 }}>
                      <AdaptativoPrevia fundo={fundoUrl} frente={frenteUrl} lado={52} raio="50%" />
                      <div style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>Raio de Luz</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <strong className="pequeno">Android 13+ com ícone temático (monocromático)</strong>
                <div className="linha" style={{ marginTop: 10, gap: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d8e2ff', overflow: 'hidden', position: 'relative' }}>
                    <img src={monoUrl} alt="" style={{ position: 'absolute', width: 96, height: 96, left: -16, top: -16, filter: 'invert(1) brightness(0.25) sepia(1) hue-rotate(190deg) saturate(4)' }} />
                  </div>
                  <span className="texto-2 pequeno">O Android pinta a silhueta com a cor do papel de parede do usuário.</span>
                </div>
              </div>

              <div>
                <strong className="pequeno">Notificação</strong>
                <div style={{ marginTop: 10, background: '#f1f3f4', borderRadius: 14, padding: 12, maxWidth: 330 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#C9A227', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <img src={notifUrl} alt="" style={{ width: 16, height: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>Parabéns, seu cadastro foi aprovado! 🎉</div>
                      <div style={{ fontSize: 12, color: '#444' }}>Toque aqui e confira nossos milhares de produtos.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <strong className="pequeno">Abertura do app</strong>
                <div style={{ marginTop: 10, background: cor, borderRadius: 18, width: 130, height: 230, display: 'grid', placeItems: 'center' }}>
                  <img src={splashUrl} alt="" style={{ width: 100, height: 100 }} />
                </div>
              </div>
            </div>
          )}
        </Cartao>
      </div>

      <Cartao
        titulo="3. Arquivos prontos"
        acoes={
          <Botao variante="primario" onClick={baixarTodos} disabled={!arquivos}>
            Baixar todos
          </Botao>
        }>
        {!arquivos ? (
          <p className="texto-2">Os arquivos aparecem aqui depois de escolher a logo.</p>
        ) : (
          <div className="pilha" style={{ gap: 10 }}>
            {arquivos.map((a) => (
              <div key={a.nome} className="linha" style={{ gap: 12 }}>
                <img src={a.url} alt="" style={{ width: 40, height: 40, objectFit: 'contain', background: '#7a7f94', borderRadius: 6 }} />
                <div style={{ flex: 1 }}>
                  <strong>{a.nome}</strong>
                  <div className="texto-2 pequeno">{a.descricao}</div>
                </div>
                <Botao pequeno onClick={() => baixar(a)}>
                  Baixar
                </Botao>
              </div>
            ))}
            <div className="caixa-aviso" style={{ marginTop: 8 }}>
              <strong>Como aplicar:</strong> coloque os arquivos na pasta <code>assets/images/</code> do projeto (substituindo os de mesmo nome), publique no
              repositório e gere um build novo do app (APK de teste ou pacote da Play Store). O ícone do celular só muda para quem instalar a versão nova. A
              imagem de <code>{completoUrl ? 'icone-play-store-512.png' : ''}</code> é a que você envia na ficha da Play Store.
            </div>
          </div>
        )}
      </Cartao>
    </>
  );
}

// Ícone adaptativo do Android: a tela é 108dp e só 72dp aparecem dentro da máscara.
function AdaptativoPrevia({ fundo, frente, lado, raio }: { fundo: string; frente: string; lado: number; raio: string }) {
  const interno = lado * (108 / 72);
  const deslocamento = -(interno - lado) / 2;
  const estilo = { position: 'absolute', width: interno, height: interno, left: deslocamento, top: deslocamento } as const;
  return (
    <div style={{ width: lado, height: lado, borderRadius: raio, overflow: 'hidden', position: 'relative', margin: '0 auto', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}>
      <img src={fundo} alt="" style={estilo} />
      <img src={frente} alt="" style={estilo} />
    </div>
  );
}

