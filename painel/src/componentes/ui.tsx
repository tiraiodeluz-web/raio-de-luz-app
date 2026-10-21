import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router';

import { mensagemErro } from '../lib/erros';
import { urlImagem } from '../lib/imagens';

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma' | 'dourado' | 'whatsapp';

export function Botao({
  variante = 'secundario',
  pequeno,
  carregando,
  icone,
  children,
  className,
  disabled,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; pequeno?: boolean; carregando?: boolean; icone?: ReactNode }) {
  return (
    <button
      type="button"
      className={['botao', variante, pequeno && 'pequeno', className].filter(Boolean).join(' ')}
      disabled={disabled || carregando}
      {...resto}>
      {carregando ? <span className="girando" /> : icone}
      {children}
    </button>
  );
}

export function CabecalhoPagina({ titulo, descricao, acoes, voltar }: { titulo: ReactNode; descricao?: ReactNode; acoes?: ReactNode; voltar?: { para: string; rotulo: string } }) {
  return (
    <div className="cabecalho-pagina">
      <div className="titulos">
        {voltar ? (
          <Link className="voltar" to={voltar.para}>
            ← {voltar.rotulo}
          </Link>
        ) : null}
        <h1>{titulo}</h1>
        {descricao ? <p>{descricao}</p> : null}
      </div>
      {acoes ? <div className="acoes">{acoes}</div> : null}
    </div>
  );
}

export function Cartao({ titulo, acoes, children, semCorpo, className }: { titulo?: ReactNode; acoes?: ReactNode; children: ReactNode; semCorpo?: boolean; className?: string }) {
  return (
    <section className={['cartao', className].filter(Boolean).join(' ')}>
      {titulo || acoes ? (
        <div className="cartao-cabecalho">
          {typeof titulo === 'string' ? <h2>{titulo}</h2> : titulo}
          {acoes}
        </div>
      ) : null}
      {semCorpo ? children : <div className="cartao-corpo">{children}</div>}
    </section>
  );
}

export function Kpi({ rotulo, valor, detalhe, destaque, para }: { rotulo: ReactNode; valor: ReactNode; detalhe?: ReactNode; destaque?: boolean; para?: string }) {
  const conteudo = (
    <>
      <div className="rotulo">{rotulo}</div>
      <div className="valor">{valor}</div>
      {detalhe ? <div className="detalhe">{detalhe}</div> : null}
    </>
  );
  const classe = ['cartao', 'kpi', destaque && 'destaque'].filter(Boolean).join(' ');
  return para ? (
    <Link to={para} className={classe} style={{ color: 'inherit' }}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export function Campo({ rotulo, ajuda, erro, children, className }: { rotulo: ReactNode; ajuda?: ReactNode; erro?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={['campo', className].filter(Boolean).join(' ')}>
      <span>{rotulo}</span>
      {children}
      {erro ? <small className="erro">{erro}</small> : ajuda ? <small>{ajuda}</small> : null}
    </label>
  );
}

export function Entrada({ prefixo, className, ...resto }: InputHTMLAttributes<HTMLInputElement> & { prefixo?: string }) {
  const input = <input className={['entrada', className].filter(Boolean).join(' ')} {...resto} />;
  return prefixo ? (
    <div className="com-prefixo">
      <em>{prefixo}</em>
      {input}
    </div>
  ) : (
    input
  );
}

export function Selecao({ className, children, ...resto }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={['selecao', className].filter(Boolean).join(' ')} {...resto}>
      {children}
    </select>
  );
}

export function AreaTexto({ className, ...resto }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={['area-texto', className].filter(Boolean).join(' ')} {...resto} />;
}

export function Interruptor({ marcado, aoMudar, rotulo, desabilitado }: { marcado: boolean; aoMudar: (v: boolean) => void; rotulo?: ReactNode; desabilitado?: boolean }) {
  return (
    <label className="interruptor" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={marcado} disabled={desabilitado} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="trilho" />
      {rotulo ? <span>{rotulo}</span> : null}
    </label>
  );
}

export function Caixa({ marcado, aoMudar, rotulo, indeterminado }: { marcado: boolean; aoMudar: (v: boolean) => void; rotulo?: ReactNode; indeterminado?: boolean }) {
  return (
    <label className="caixa" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={marcado}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminado && !marcado;
        }}
        onChange={(e) => aoMudar(e.target.checked)}
      />
      {rotulo ? <span>{rotulo}</span> : null}
    </label>
  );
}

export type Tom = 'sucesso' | 'perigo' | 'aviso' | 'info' | 'dourado' | 'neutro';

export function Etiqueta({ tom = 'neutro', children, cor }: { tom?: Tom; children: ReactNode; cor?: string }) {
  const estilo = cor ? { background: `${cor}1a`, color: cor, borderColor: 'transparent' } : undefined;
  return (
    <span className={`etiqueta ${tom === 'neutro' ? '' : tom}`} style={estilo}>
      {children}
    </span>
  );
}

export function Abas<T extends string>({ abas, ativa, aoMudar }: { abas: { chave: T; rotulo: ReactNode; contador?: number }[]; ativa: T; aoMudar: (c: T) => void }) {
  return (
    <div className="abas" role="tablist">
      {abas.map((a) => (
        <button key={a.chave} role="tab" className={`aba ${a.chave === ativa ? 'ativa' : ''}`} onClick={() => aoMudar(a.chave)}>
          {a.rotulo}
          {a.contador !== undefined ? <span className="contador">{a.contador}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Modal({ titulo, aoFechar, children, rodape, largo }: { titulo: ReactNode; aoFechar: () => void; children: ReactNode; rodape?: ReactNode; largo?: boolean }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={`modal ${largo ? 'largo' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-cabecalho">
          <h2>{titulo}</h2>
          <button className="fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape ? <div className="modal-rodape">{rodape}</div> : null}
      </div>
    </div>
  );
}

export function Vazio({ icone = '📭', titulo, children }: { icone?: string; titulo: string; children?: ReactNode }) {
  return (
    <div className="vazio">
      <div className="icone">{icone}</div>
      <strong>{titulo}</strong>
      {children}
    </div>
  );
}

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="carregando">
      <span className="girando" /> {texto}
    </div>
  );
}

export function CaixaErro({ erro, tentarDeNovo }: { erro: unknown; tentarDeNovo?: () => void }) {
  return (
    <div className="caixa-erro linha entre">
      <span>{mensagemErro(erro)}</span>
      {tentarDeNovo ? (
        <Botao pequeno onClick={tentarDeNovo}>
          Tentar de novo
        </Botao>
      ) : null}
    </div>
  );
}

export function Miniatura({ url, grande, alt = '' }: { url: string | null | undefined; grande?: boolean; alt?: string }) {
  const src = urlImagem(url, 'miniatura');
  return src ? (
    <img className={`miniatura ${grande ? 'g' : ''}`} src={src} alt={alt} loading="lazy" />
  ) : (
    <div className={`miniatura miniatura-vazia ${grande ? 'g' : ''}`}>📦</div>
  );
}

export function Paginacao({ pagina, porPagina, total, aoMudar }: { pagina: number; porPagina: number; total: number; aoMudar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const de = total === 0 ? 0 : pagina * porPagina + 1;
  const ate = Math.min(total, (pagina + 1) * porPagina);
  return (
    <div className="paginacao">
      <span>
        {de}–{ate} de {total.toLocaleString('pt-BR')}
      </span>
      <span className="espaco" />
      <Botao pequeno disabled={pagina === 0} onClick={() => aoMudar(pagina - 1)}>
        ← Anterior
      </Botao>
      <span>
        Página {pagina + 1} de {paginas}
      </span>
      <Botao pequeno disabled={pagina + 1 >= paginas} onClick={() => aoMudar(pagina + 1)}>
        Próxima →
      </Botao>
    </div>
  );
}
