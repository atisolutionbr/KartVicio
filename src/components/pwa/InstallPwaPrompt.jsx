import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const DISMISS_KEY = 'kartvicio:pwa-install-dismissed';
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 30; // 30 dias

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPwaPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    let dismissedAt = 0;
    try {
      dismissedAt = Number(sessionStorage.getItem(DISMISS_KEY) || localStorage.getItem(DISMISS_KEY) || 0);
    } catch (_) {}
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL) return;

    const onBeforeInstall = (event) => {
      event.preventDefault();
      if (!deferred) {
        setDeferred(event);
        setOpen(true);
      }
    };

    const onInstalled = () => {
      setDeferred(null);
      setOpen(false);
      try { sessionStorage.removeItem(DISMISS_KEY); localStorage.removeItem(DISMISS_KEY); } catch (_) {}
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari não dispara beforeinstallprompt — dispara dica após 1.5s
    const ua = window.navigator.userAgent || '';
    const isIos = /iphone|ipad|ipod/i.test(ua) || (/\sMac/i.test(ua) && navigator.maxTouchPoints > 1);
    if (isIos) {
      const timer = setTimeout(() => {
        if (!isStandalone() && !dismissedAt) {
          setIosHint(true);
          setOpen(true);
        }
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferred) {
      try { await deferred.prompt(); await deferred.userChoice; } catch (_) {}
      setDeferred(null);
      setOpen(false);
    } else if (iosHint) {
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    const now = Date.now();
    try {
      sessionStorage.setItem(DISMISS_KEY, String(now));
      localStorage.setItem(DISMISS_KEY, String(now));
    } catch (_) {}
    setDeferred(null);
    setIosHint(false);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? null : handleDismiss())}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400/20">
            {iosHint ? <Smartphone className="h-7 w-7 text-yellow-600" /> : <Download className="h-7 w-7 text-yellow-600" />}
          </div>
          <AlertDialogTitle className="text-center text-xl">Instale o KartVicio</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm">
            {iosHint
              ? 'Toque em Compartilhar no Safari e escolha “Adicionar à Tela de Início” para instalar o app.'
              : 'Instale o aplicativo para acesso rápido e visualização em escala de 70%. É necessário estar conectado à internet para consultar e salvar os dados.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-center gap-2 sm:justify-center">
          <AlertDialogCancel asChild>
            <Button variant="ghost" onClick={handleDismiss} className="min-h-[44px]">
              <X className="h-4 w-4" /> Agora não
            </Button>
          </AlertDialogCancel>
          {!iosHint && (
            <AlertDialogAction asChild>
              <Button onClick={handleInstall} className="min-h-[44px] bg-yellow-500 text-gray-900 hover:bg-yellow-400">
                <Download className="h-4 w-4" /> Instalar
              </Button>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
