import React,{useEffect,useState} from 'react';
const messages={not_configured:'Este provedor ainda não foi ativado.',provider_unavailable:'Provedor indisponível. Tente novamente.',invalid:'Não foi possível validar o acesso. Tente novamente.',not_allowed:'Seu cadastro está inativo ou não possui acesso.',link_required:'Esta conta precisa ser vinculada ao seu cadastro antes do primeiro acesso.'};
export default function Login({login,email,setEmail,password,setPassword,error,busy}) {
 const [providers,setProviders]=useState({google:false,microsoft:false});
 useEffect(()=>{fetch('/api/auth/providers').then(r=>r.ok?r.json():{}).then(setProviders).catch(()=>{});},[]);
 const message=error||messages[new URLSearchParams(window.location.search).get('auth_error')];
 return <div className="relative isolate min-h-screen bg-[#f4f2ed] flex items-center justify-center overflow-hidden p-6">
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center select-none"><img src="/media/kartvicio-logo.png" alt="" className="w-[min(110vw,1000px)] max-w-none object-contain opacity-[0.12] mix-blend-multiply"/></div>
  <form onSubmit={login} className="bg-white/95 rounded-2xl p-8 w-full max-w-md shadow-xl space-y-5 border border-white/80">
  <div className="text-center"><img src="/media/kartvicio-logo.png" alt="KartVicio" className="w-24 h-24 object-contain mx-auto mb-3 mix-blend-multiply"/><h1 className="text-3xl font-black">KartVicio</h1><p className="text-gray-500 mt-2">Entre para acompanhar os campeonatos</p></div>
  <div className="space-y-2">{[['google','Continuar com Google'],['microsoft','Continuar com Microsoft']].map(([key,label])=><button key={key} type="button" disabled={!providers[key]} onClick={()=>window.location.assign('/api/auth/'+key+'/start')} className="w-full border border-slate-300 rounded-lg p-3 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">{label}</button>)}{(!providers.google||!providers.microsoft)&&<p className="text-xs text-center text-slate-500">Os provedores desabilitados aguardam ativação.</p>}</div>
  <p className="text-center text-sm text-gray-400">ou entre com e-mail e senha</p>
  <label className="block">E-mail<input className="mt-1 border rounded-lg w-full p-3" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
  <label className="block">Senha<input className="mt-1 border rounded-lg w-full p-3" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
  {message&&<p role="alert" className="text-red-700">{message}</p>}<button disabled={busy} className="w-full bg-yellow-400 rounded-lg p-3 font-bold disabled:opacity-50">{busy?'Entrando…':'Entrar'}</button>
 </form></div>;
}
