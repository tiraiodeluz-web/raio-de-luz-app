export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          ativo: boolean
          autor: string | null
          bubble_id: string | null
          conteudo: string | null
          criado_em: string
          data_envio: string | null
          foto_url: string
          id: string
          ordem: number
          titulo: string | null
        }
        Insert: {
          ativo?: boolean
          autor?: string | null
          bubble_id?: string | null
          conteudo?: string | null
          criado_em?: string
          data_envio?: string | null
          foto_url: string
          id?: string
          ordem?: number
          titulo?: string | null
        }
        Update: {
          ativo?: boolean
          autor?: string | null
          bubble_id?: string | null
          conteudo?: string | null
          criado_em?: string
          data_envio?: string | null
          foto_url?: string
          id?: string
          ordem?: number
          titulo?: string | null
        }
        Relationships: []
      }
      carrinho_itens: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          produto_id: string
          quantidade: number
          santo_id: string | null
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          produto_id: string
          quantidade: number
          santo_id?: string | null
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          produto_id?: string
          quantidade?: number
          santo_id?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrinho_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrinho_itens_santo_id_fkey"
            columns: ["santo_id"]
            isOneToOne: false
            referencedRelation: "santos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrinho_itens_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          bubble_id: string | null
          criado_em: string
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          bubble_id?: string | null
          criado_em?: string
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          bubble_id?: string | null
          criado_em?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativo: boolean
          atualizado_em: string
          bubble_id: string | null
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          bubble_id?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          bubble_id?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      cupons: {
        Row: {
          ativo: boolean
          bubble_id: string | null
          codigo: string
          criado_em: string
          id: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          bubble_id?: string | null
          codigo: string
          criado_em?: string
          id?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          bubble_id?: string | null
          codigo?: string
          criado_em?: string
          id?: string
          valor?: number
        }
        Relationships: []
      }
      dispositivos_push: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          plataforma: string
          token: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          plataforma: string
          token: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          plataforma?: string
          token?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_push_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      enderecos: {
        Row: {
          atualizado_em: string
          bairro: string
          cep: string
          cidade: string
          complemento: string | null
          criado_em: string
          estado: string
          id: string
          numero: string
          principal: boolean
          rua: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          bairro: string
          cep: string
          cidade: string
          complemento?: string | null
          criado_em?: string
          estado: string
          id?: string
          numero: string
          principal?: boolean
          rua: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string | null
          criado_em?: string
          estado?: string
          id?: string
          numero?: string
          principal?: boolean
          rua?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_push: {
        Row: {
          ativo: boolean
          atualizado_em: string
          chave: string
          corpo: string
          descricao: string
          publico: string
          rota: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          chave: string
          corpo: string
          descricao: string
          publico: string
          rota?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          chave?: string
          corpo?: string
          descricao?: string
          publico?: string
          rota?: string | null
          titulo?: string
        }
        Relationships: []
      }
      fila_push: {
        Row: {
          criado_em: string
          erro: string | null
          id: number
          notificacao_id: string
          processado_em: string | null
          status: string
          tentativas: number
        }
        Insert: {
          criado_em?: string
          erro?: string | null
          id?: never
          notificacao_id: string
          processado_em?: string | null
          status?: string
          tentativas?: number
        }
        Update: {
          criado_em?: string
          erro?: string | null
          id?: never
          notificacao_id?: string
          processado_em?: string | null
          status?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "fila_push_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          catalogo_destino_id: string | null
          corpo: string
          criado_em: string
          criado_por: string | null
          destinatario_id: string | null
          evento: string | null
          id: string
          imagem_url: string | null
          legenda: string | null
          rota_destino: string | null
          titulo: string
        }
        Insert: {
          catalogo_destino_id?: string | null
          corpo: string
          criado_em?: string
          criado_por?: string | null
          destinatario_id?: string | null
          evento?: string | null
          id?: string
          imagem_url?: string | null
          legenda?: string | null
          rota_destino?: string | null
          titulo: string
        }
        Update: {
          catalogo_destino_id?: string | null
          corpo?: string
          criado_em?: string
          criado_por?: string | null
          destinatario_id?: string | null
          evento?: string | null
          id?: string
          imagem_url?: string | null
          legenda?: string | null
          rota_destino?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_catalogo_destino_id_fkey"
            columns: ["catalogo_destino_id"]
            isOneToOne: false
            referencedRelation: "catalogos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          id: string
          imagem_url: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          produto_nome: string
          quantidade: number
          santo_id: string | null
          santo_nome: string | null
          sku: string
          subtotal: number
        }
        Insert: {
          id?: string
          imagem_url?: string | null
          pedido_id: string
          preco_unitario: number
          produto_id?: string | null
          produto_nome: string
          quantidade: number
          santo_id?: string | null
          santo_nome?: string | null
          sku: string
          subtotal: number
        }
        Update: {
          id?: string
          imagem_url?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          produto_nome?: string
          quantidade?: number
          santo_id?: string | null
          santo_nome?: string | null
          sku?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_santo_id_fkey"
            columns: ["santo_id"]
            isOneToOne: false
            referencedRelation: "santos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          cliente_snapshot: Json | null
          codigo_rastreio: string | null
          criado_em: string
          cupom_codigo: string | null
          desconto: number
          endereco_entrega: Json | null
          id: string
          numero: number
          observacoes: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          status_alterado_em: string
          subtotal: number
          total: number
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          cliente_snapshot?: Json | null
          codigo_rastreio?: string | null
          criado_em?: string
          cupom_codigo?: string | null
          desconto?: number
          endereco_entrega?: Json | null
          id?: string
          numero?: never
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_alterado_em?: string
          subtotal?: number
          total?: number
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          cliente_snapshot?: Json | null
          codigo_rastreio?: string | null
          criado_em?: string
          cupom_codigo?: string | null
          desconto?: number
          endereco_entrega?: Json | null
          id?: string
          numero?: never
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_alterado_em?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          aprovado_em: string | null
          atualizado_em: string
          bubble_id: string | null
          cadastro_aprovado: boolean
          carrinho_msg_1dia_em: string | null
          carrinho_msg_60min_em: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo: string | null
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          razao_social: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_usuario"]
          uf: string | null
          ultimo_acesso: string | null
          ultimo_produto_carrinho: string | null
        }
        Insert: {
          aprovado_em?: string | null
          atualizado_em?: string
          bubble_id?: string | null
          cadastro_aprovado?: boolean
          carrinho_msg_1dia_em?: string | null
          carrinho_msg_60min_em?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string | null
          criado_em?: string
          foto_url?: string | null
          id: string
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
          uf?: string | null
          ultimo_acesso?: string | null
          ultimo_produto_carrinho?: string | null
        }
        Update: {
          aprovado_em?: string | null
          atualizado_em?: string
          bubble_id?: string | null
          cadastro_aprovado?: boolean
          carrinho_msg_1dia_em?: string | null
          carrinho_msg_60min_em?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
          uf?: string | null
          ultimo_acesso?: string | null
          ultimo_produto_carrinho?: string | null
        }
        Relationships: []
      }
      produto_santos: {
        Row: {
          foto_url: string | null
          produto_id: string
          santo_id: string
        }
        Insert: {
          foto_url?: string | null
          produto_id: string
          santo_id: string
        }
        Update: {
          foto_url?: string | null
          produto_id?: string
          santo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_santos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_santos_santo_id_fkey"
            columns: ["santo_id"]
            isOneToOne: false
            referencedRelation: "santos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          bubble_id: string | null
          busca: string | null
          catalogo_id: string | null
          categoria_id: string | null
          criado_em: string
          descricao: string | null
          destaque: boolean
          embalagem: number
          estoque: number | null
          id: string
          imagem_principal: string | null
          imagens: string[]
          nome: string
          personalizavel: boolean
          preco: number
          preco_efetivo: number | null
          preco_promocional: number | null
          referencia: string | null
          sku: string
          vendas: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          bubble_id?: string | null
          busca?: string | null
          catalogo_id?: string | null
          categoria_id?: string | null
          criado_em?: string
          descricao?: string | null
          destaque?: boolean
          embalagem?: number
          estoque?: number | null
          id?: string
          imagem_principal?: string | null
          imagens?: string[]
          nome: string
          personalizavel?: boolean
          preco: number
          preco_efetivo?: number | null
          preco_promocional?: number | null
          referencia?: string | null
          sku: string
          vendas?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          bubble_id?: string | null
          busca?: string | null
          catalogo_id?: string | null
          categoria_id?: string | null
          criado_em?: string
          descricao?: string | null
          destaque?: boolean
          embalagem?: number
          estoque?: number | null
          id?: string
          imagem_principal?: string | null
          imagens?: string[]
          nome?: string
          personalizavel?: boolean
          preco?: number
          preco_efetivo?: number | null
          preco_promocional?: number | null
          referencia?: string | null
          sku?: string
          vendas?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "catalogos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      santos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          bubble_id: string | null
          codigo: string | null
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          bubble_id?: string | null
          codigo?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          bubble_id?: string | null
          codigo?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adicionar_ao_carrinho: {
        Args: {
          p_produto_id: string
          p_quantidade?: number
          p_santo_id?: string
        }
        Returns: {
          atualizado_em: string
          criado_em: string
          id: string
          produto_id: string
          quantidade: number
          santo_id: string | null
          usuario_id: string
        }
        SetofOptions: {
          from: "*"
          to: "carrinho_itens"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      carrinhos_abandonados: {
        Args: never
        Returns: {
          codigo: string
          itens: number
          nome: string
          razao_social: string
          telefone: string
          ultimo_acesso: string
          ultimo_produto_carrinho: string
          usuario_id: string
          valor: number
          whatsapp_enviado: boolean
        }[]
      }
      catalogos_da_categoria: {
        Args: { p_categoria_id: string }
        Returns: {
          id: string
          nome: string
          qtd: number
        }[]
      }
      categorias_do_catalogo: {
        Args: { p_catalogo_id: string }
        Returns: {
          id: string
          nome: string
          qtd: number
        }[]
      }
      cnpj_disponivel: { Args: { p_cnpj: string }; Returns: boolean }
      criar_pedido: {
        Args: {
          p_cupom?: string
          p_endereco_id: string
          p_observacoes?: string
        }
        Returns: {
          numero: number
          pedido_id: string
          total: number
        }[]
      }
      eh_admin: { Args: never; Returns: boolean }
      excluir_minha_conta: { Args: never; Returns: undefined }
      formatar_reais: { Args: { v: number }; Returns: string }
      metricas_admin: { Args: never; Returns: Json }
      pode_comprar: { Args: never; Returns: boolean }
      produtos_recomendados: {
        Args: { p_minimo?: number; p_produto_id: string }
        Returns: {
          ativo: boolean
          atualizado_em: string
          bubble_id: string | null
          busca: string | null
          catalogo_id: string | null
          categoria_id: string | null
          criado_em: string
          descricao: string | null
          destaque: boolean
          embalagem: number
          estoque: number | null
          id: string
          imagem_principal: string | null
          imagens: string[]
          nome: string
          personalizavel: boolean
          preco: number
          preco_efetivo: number | null
          preco_promocional: number | null
          referencia: string | null
          sku: string
          vendas: number
        }[]
        SetofOptions: {
          from: "*"
          to: "produtos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      push_segredo_confere: { Args: { p_segredo: string }; Returns: boolean }
      registrar_dispositivo: {
        Args: { p_plataforma: string; p_token: string }
        Returns: undefined
      }
      remover_dispositivo: { Args: { p_token: string }; Returns: undefined }
      reservar_fila_push: {
        Args: { p_limite?: number }
        Returns: {
          id: number
          notificacao_id: string
        }[]
      }
      status_pedido_rotulo: {
        Args: { s: Database["public"]["Enums"]["status_pedido"] }
        Returns: string
      }
      tokens_clientes_aprovados: {
        Args: never
        Returns: {
          token: string
        }[]
      }
      validar_cupom: {
        Args: { p_codigo: string }
        Returns: {
          codigo: string
          valor: number
        }[]
      }
    }
    Enums: {
      status_pedido:
        | "aguardando_pagamento"
        | "pago"
        | "em_separacao"
        | "em_producao"
        | "enviado"
        | "entregue"
        | "cancelado"
      tipo_usuario: "admin" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_pedido: [
        "aguardando_pagamento",
        "pago",
        "em_separacao",
        "em_producao",
        "enviado",
        "entregue",
        "cancelado",
      ],
      tipo_usuario: ["admin", "cliente"],
    },
  },
} as const
