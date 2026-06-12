import React, { useEffect, useState } from 'react';
import api from './api';
import { Zap, Send, Save, ExternalLink, Loader2, CheckCircle2, AlertCircle, Pin } from 'lucide-react';

const EMPTY = {
  pix_key: '', pix_nome: '', pix_cidade: '',
  telegram_bot_token: '', telegram_chat_id: '', telegram_enabled: false,
  valor_inscricao: 75, mensagem: '', data_prova: '',
};

function Toast({ kind, text }) {
  if (!text) return null;
  const cls = kind === 'ok' ? 'dp-form-ok' : 'dp-form-err';
  return <div className={cls}>{kind === 'ok' ? <CheckCircle2 size={15}/> : <AlertCircle size={15}/>} {text}</div>;
}

export default function AdminSettings() {
  const [s, setS] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [savingPix, setSavingPix] = useState(false);
  const [savingTg, setSavingTg] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [pixMsg, setPixMsg] = useState({ kind:'', text:'' });
  const [tgMsg, setTgMsg] = useState({ kind:'', text:'' });

  useEffect(() => {
    api.get('/admin/settings').then(r => {
      setS({ ...EMPTY, ...r.data });
    }).finally(() => setLoading(false));
  }, []);

  function up(k, v) { setS(prev => ({ ...prev, [k]: v })); }

  async function savePix(e) {
    e.preventDefault(); setPixMsg({kind:'',text:''}); setSavingPix(true);
    try {
      await api.put('/admin/settings', {
        pix_key: s.pix_key.trim(),
        pix_nome: s.pix_nome.trim(),
        pix_cidade: s.pix_cidade.trim(),
      });
      setPixMsg({ kind:'ok', text:'Chave PIX salva com sucesso.' });
      setTimeout(()=>setPixMsg({kind:'',text:''}), 3000);
    } catch (e) {
      setPixMsg({ kind:'err', text: e?.response?.data?.detail || 'Erro ao salvar.' });
    } finally { setSavingPix(false); }
  }

  async function saveTelegram(e) {
    e.preventDefault(); setTgMsg({kind:'',text:''}); setSavingTg(true);
    try {
      await api.put('/admin/settings', {
        telegram_bot_token: s.telegram_bot_token.trim(),
        telegram_chat_id: String(s.telegram_chat_id).trim(),
        telegram_enabled: !!s.telegram_enabled,
      });
      setTgMsg({ kind:'ok', text:'Configuração do Telegram salva.' });
      setTimeout(()=>setTgMsg({kind:'',text:''}), 3000);
    } catch (e) {
      setTgMsg({ kind:'err', text: e?.response?.data?.detail || 'Erro ao salvar.' });
    } finally { setSavingTg(false); }
  }

  async function testTelegram() {
    setTgMsg({kind:'',text:''}); setTestingTg(true);
    try {
      await api.post('/admin/telegram/test', {
        bot_token: s.telegram_bot_token.trim(),
        chat_id: String(s.telegram_chat_id).trim(),
      });
      setTgMsg({ kind:'ok', text:'Mensagem de teste enviada! Confira no Telegram.' });
    } catch (e) {
      setTgMsg({ kind:'err', text: e?.response?.data?.detail || 'Erro ao enviar teste.' });
    } finally { setTestingTg(false); }
  }

  if (loading) {
    return (
      <>
        <div className="dp-page-head"><h1 className="dp-page-h1">Configurações</h1></div>
        <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}><Loader2 size={20} className="dp-spin"/></div>
      </>
    );
  }

  return (
    <>
      <div className="dp-page-head">
        <div>
          <h1 className="dp-page-h1">Configurações</h1>
          <div className="dp-page-sub">Configure a chave PIX e as notificações do Telegram.</div>
        </div>
      </div>

      {/* === Card PIX === */}
      <form className="dp-cfg-card" onSubmit={savePix}>
        <div className="dp-cfg-head">
          <div className="dp-cfg-ico pix"><Zap size={22} strokeWidth={2.4}/></div>
          <div>
            <h2 className="dp-cfg-title">Chave PIX</h2>
            <p className="dp-cfg-desc">
              Cadastre a chave PIX que vai receber os pagamentos das inscrições.<br/>
              Aceita CPF, CNPJ, e-mail, telefone ou chave aleatória.
            </p>
          </div>
        </div>

        <div className="dp-field-light">
          <label>Chave PIX <span className="req">*</span></label>
          <input
            className="dp-input-light mono"
            placeholder="Ex: chave@email.com, 11999998888, ou chave aleatória"
            value={s.pix_key}
            onChange={e=>up('pix_key', e.target.value)}
            data-testid="input-pix-key"
            required
          />
        </div>

        <div className="dp-row-2">
          <div className="dp-field-light">
            <label>Nome do beneficiário</label>
            <input
              className="dp-input-light mono"
              placeholder="Ex: Minha Empresa LTDA"
              value={s.pix_nome}
              onChange={e=>up('pix_nome', e.target.value)}
              maxLength={25}
              data-testid="input-pix-nome"
            />
          </div>
          <div className="dp-field-light">
            <label>Cidade</label>
            <input
              className="dp-input-light mono"
              placeholder="Ex: SAO LUIS MA"
              value={s.pix_cidade}
              onChange={e=>up('pix_cidade', e.target.value)}
              maxLength={15}
              data-testid="input-pix-cidade"
            />
          </div>
        </div>

        <Toast kind={pixMsg.kind} text={pixMsg.text}/>

        <div className="dp-cfg-actions">
          <button type="submit" className="dp-btn primary" disabled={savingPix} data-testid="btn-save-pix">
            {savingPix ? <><Loader2 size={14} className="dp-spin"/> Salvando…</> : <><Save size={14}/> Salvar chave PIX</>}
          </button>
        </div>
      </form>

      {/* === Card Telegram === */}
      <form className="dp-cfg-card" onSubmit={saveTelegram} style={{marginTop:24}}>
        <div className="dp-cfg-head">
          <div className="dp-cfg-ico tg"><Send size={20} strokeWidth={2.4}/></div>
          <div>
            <h2 className="dp-cfg-title">Notificações Telegram</h2>
            <p className="dp-cfg-desc">
              Receba uma mensagem no seu bot/grupo do Telegram sempre que uma nova inscrição for criada.
            </p>
          </div>
        </div>

        <div className="dp-field-light">
          <label>Bot Token <span className="req">*</span></label>
          <input
            className="dp-input-light mono"
            placeholder="Ex: 123456789:ABCdefGhiJklMnoPQRstuVWxyz"
            value={s.telegram_bot_token}
            onChange={e=>up('telegram_bot_token', e.target.value)}
            data-testid="input-tg-token"
          />
        </div>

        <div className="dp-field-light">
          <label>Chat ID (grupo ou usuário) <span className="req">*</span></label>
          <input
            className="dp-input-light mono"
            placeholder="Ex: -1001234567890  ou  123456789"
            value={s.telegram_chat_id}
            onChange={e=>up('telegram_chat_id', e.target.value)}
            data-testid="input-tg-chat"
          />
        </div>

        <div className="dp-field-light" style={{marginTop:6}}>
          <label>Status das notificações</label>
          <label className="dp-switch-row">
            <span className="dp-switch">
              <input
                type="checkbox"
                checked={!!s.telegram_enabled}
                onChange={e=>up('telegram_enabled', e.target.checked)}
                data-testid="toggle-tg-enabled"
              />
              <span className="dp-switch-slider"/>
            </span>
            <span className={s.telegram_enabled ? 'dp-switch-lbl on' : 'dp-switch-lbl off'}>
              {s.telegram_enabled
                ? 'Ativo — você receberá notificação a cada nova inscrição'
                : 'Inativo — nenhuma notificação será enviada'}
            </span>
          </label>
        </div>

        <div className="dp-tg-help">
          <div className="dp-tg-help-title"><Pin size={14}/> Como obter Bot Token e Chat ID?</div>
          <ol className="dp-tg-help-list">
            <li>Crie um bot conversando com <code>@BotFather</code> no Telegram (comando <code>/newbot</code>) — ele te dará o <strong>Bot Token</strong>.</li>
            <li>Adicione o bot ao seu <strong>grupo</strong> e envie qualquer mensagem.</li>
            <li>Acesse <code>https://api.telegram.org/bot&lt;SEU_TOKEN&gt;/getUpdates</code> no navegador.</li>
            <li>Copie o valor de <code>chat.id</code> (grupos começam com sinal de menos, ex.: <code>-100…</code>).</li>
            <li>Cole os valores acima e clique em <strong>Salvar</strong>.</li>
          </ol>
        </div>

        <Toast kind={tgMsg.kind} text={tgMsg.text}/>

        <div className="dp-cfg-actions">
          <button type="button" className="dp-btn outline-green" disabled={testingTg} onClick={testTelegram} data-testid="btn-test-tg">
            {testingTg ? <><Loader2 size={14} className="dp-spin"/> Enviando…</> : <><ExternalLink size={14}/> Testar envio</>}
          </button>
          <button type="submit" className="dp-btn primary" disabled={savingTg} data-testid="btn-save-tg">
            {savingTg ? <><Loader2 size={14} className="dp-spin"/> Salvando…</> : <><Save size={14}/> Salvar Telegram</>}
          </button>
        </div>
      </form>
    </>
  );
}
