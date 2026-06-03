'use client';

import type { ParceiroListItem } from '@/types/parceiro';

interface CupomFisicoProps {
  parceiro: ParceiroListItem;
}

export function CupomFisico({ parceiro }: CupomFisicoProps) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="cupom-fisico"
      style={{
        backgroundColor: '#ffffff',
        color: '#111111',
        width: '360px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#0d0d0d',
          padding: '16px 20px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#e43333', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
          SASSI IMÓVEIS
        </p>
        <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '4px 0 0' }}>
          CLUBE DE BENEFÍCIOS
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 20px 0' }}>
        {/* Nome e segmento */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#111111', margin: 0, lineHeight: 1.2 }}>
            {parceiro.nome_empresa.toUpperCase()}
          </p>
          {parceiro.segmento && (
            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {parceiro.segmento}
            </p>
          )}
        </div>

        {/* Divisor tracejado */}
        <div style={{ borderTop: '2px dashed #d1d5db', margin: '0 0 16px' }} />

        {/* Benefício */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
            SEU BENEFÍCIO
          </p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#e43333', margin: 0, lineHeight: 1.4 }}>
            {parceiro.desconto_descricao}
          </p>
        </div>

        {/* Divisor tracejado */}
        <div style={{ borderTop: '2px dashed #d1d5db', margin: '0 0 16px' }} />

        {/* Código do cupom */}
        {parceiro.codigo_cupom && (
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>
              CÓDIGO DO CUPOM
            </p>
            <div
              style={{
                backgroundColor: '#f5f5f5',
                border: '2px dashed #d1d5db',
                borderRadius: '6px',
                padding: '10px 16px',
                display: 'inline-block',
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: '28px', fontWeight: 700, color: '#111111', letterSpacing: '0.1em' }}>
                {parceiro.codigo_cupom}
              </span>
            </div>
          </div>
        )}

        {/* Validade */}
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>
            Válido para: <strong>Inquilinos Sassi Imóveis</strong>
          </p>
          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', margin: '4px 0 0' }}>
            {parceiro.frequencia_desconto ?? 'Consultar parceiro'}
          </p>
        </div>

        {/* Divisor */}
        <div style={{ borderTop: '1px solid #e5e7eb', margin: '0 0 12px' }} />

        {/* Instrução */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>
            Apresente este cupom na loja
          </p>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#111111', margin: 0 }}>
            {parceiro.nome_empresa}
          </p>
        </div>

        {/* Data de geração */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>
            Gerado em: {dataFormatada}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: '#0d0d0d',
          padding: '12px 20px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '10px', letterSpacing: '0.08em', margin: 0 }}>
          SASSI IMÓVEIS | clube.sassiimoveis.com.br
        </p>
      </div>
    </div>
  );
}
