import Login from '@/components/Login';
import React,{createContext,useContext,useEffect,useState} from 'react';
import {base44,request} from '@/api/base44Client';
const Context=createContext(null);
export function AuthProvider({children}) {
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const checkUserAuth=async()=>{try{setUser(await base44.auth.me());}catch{setUser(null);}finally{setLoading(false);}};
 useEffect(()=>{checkUserAuth();},[]);
 const login=async(event)=>{event.preventDefault();setBusy(true);setError('');try{await request('/api/auth/login',{email,password});window.location.href='/';}catch(e){setError(e.message);}finally{setBusy(false);}};
 if(loading)return <div className="min-h-screen grid place-items-center">Carregando KartVicio…</div>;
 if(!user)return <Login {...{login,email,setEmail,password,setPassword,error,busy}}/>;
 return <Context.Provider value={{user,isAuthenticated:true,isLoadingAuth:false,isLoadingPublicSettings:false,authChecked:true,authError:null,checkUserAuth,navigateToLogin:base44.auth.login,logout:base44.auth.logout}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
