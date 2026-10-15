import nodemailer from 'nodemailer';
import {origin} from './config.mjs';

export function smtpOptions(env=process.env) {
 if(!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM)return null;
 const port=Number(env.SMTP_PORT || 465);
 if(![465,587].includes(port))throw new Error('SMTP_PORT deve ser 465 ou 587.');
 if(/[\r\n]/.test(env.SMTP_FROM))throw new Error('SMTP_FROM inválido.');
 return {host:env.SMTP_HOST,port,secure:port===465,requireTLS:port===587,
  auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000};
}

export async function installInvitations(app,pool,{env=process.env,createTransport=nodemailer.createTransport}={}) {
 const options=smtpOptions(env);
 const transport=options?createTransport(options):null;
 await pool.query(`CREATE TABLE IF NOT EXISTS kartvicio.invitations (
 email text PRIMARY KEY,last_attempt timestamptz NOT NULL,sent_at timestamptz,invited_by text NOT NULL,status text NOT NULL)`);
 const admin=(req,res,next)=>req.user.permissions.permissao==='admin'?next():res.status(403).json({message:'Sem permissão'});
 app.get('/api/users/invitations/status',admin,(req,res)=>res.json({configured:Boolean(transport)}));
 app.post('/api/users/invite',admin,async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase();
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return res.status(400).json({message:'E-mail inválido.'});
  const configs=(await pool.query("SELECT data FROM kartvicio.records WHERE entity='Usuario' AND lower(trim(data->>'email'))=$1",[email])).rows;
  if(!configs.length || configs.some(r=>r.data.ativo===false))return res.status(400).json({message:'Cadastre e ative o acesso deste usuário antes de convidá-lo.'});
  if(!transport)return res.status(503).json({message:'O envio de convites aguarda a configuração do servidor de e-mail.'});
  const claimed=await pool.query(`INSERT INTO kartvicio.invitations VALUES($1,now(),null,$2,'sending')
   ON CONFLICT(email) DO UPDATE SET last_attempt=now(),invited_by=excluded.invited_by,status='sending'
   WHERE kartvicio.invitations.last_attempt<now()-interval '5 minutes' RETURNING email`,[email,req.user.email]);
  if(!claimed.rowCount)return res.status(429).json({message:'Aguarde cinco minutos antes de reenviar o convite.'});
  try {
   const result=await transport.sendMail({from:env.SMTP_FROM,to:email,subject:'Seu acesso ao KartVicio',
    text:`Seu cadastro de acesso ao KartVicio está disponível.\n\nAcesse ${origin}/login e entre com sua conta Google cadastrada. As permissões são definidas pelo administrador. Se sua conta não usa Google, entre em contato com o administrador para configurar o acesso.\n\nEste convite não contém senha e não altera suas permissões.`});
   if(!result.accepted?.length)throw new Error('Destinatário recusado');
   await pool.query("UPDATE kartvicio.invitations SET status='sent',sent_at=now() WHERE email=$1",[email]);
   res.json({ok:true});
  } catch {
   await pool.query("UPDATE kartvicio.invitations SET status='failed' WHERE email=$1",[email]);
   res.status(502).json({message:'O servidor de e-mail não confirmou o envio. Verifique a configuração SMTP.'});
  }
 });
}
