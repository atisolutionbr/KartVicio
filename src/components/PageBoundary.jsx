import React from 'react';
export default class PageBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(this.state.failed)return <div role="alert" className="rounded-xl border bg-white p-6 space-y-3">
   <p>Não foi possível carregar esta tela. Verifique sua conexão e tente novamente.</p>
   <button className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold" onClick={()=>window.location.reload()}>Tentar novamente</button>
  </div>;
  return this.props.children;
 }
}
