'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';

export type ContactMessagingLabels = {
  messagingTitle: string;
  whatsapp: string;
  wechat: string;
  line: string;
  telegram: string;
  chatNow: string;
  addUs: string;
  wechatHint: string;
  messagingClose: string;
};

type Props = {
  whatsappLink: string;
  wechatId: string;
  lineLink: string;
  telegramLink?: string;
  labels: ContactMessagingLabels;
};

export function ContactMessagingSection({ whatsappLink, wechatId, lineLink, telegramLink = '', labels }: Props) {
  const [wechatOpen, setWechatOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = useId();

  const hasAny = Boolean(whatsappLink || wechatId || lineLink || telegramLink);

  useEffect(() => {
    if (!wechatOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [wechatOpen]);

  useEffect(() => {
    if (wechatOpen) closeBtnRef.current?.focus();
  }, [wechatOpen]);

  if (!hasAny) return null;

  return (
    <>
      <div className="contact-messaging-wrap">
        <h2 className="contact-messaging-title">{labels.messagingTitle}</h2>
        <div className="contact-messaging-grid">
          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-messaging-card contact-messaging-card-link"
            >
              <span className="contact-messaging-icon-wrap" aria-hidden>
                <Image
                  src="/icons/messaging-whatsapp.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="contact-messaging-icon-img"
                />
              </span>
              <span className="contact-messaging-app-name">{labels.whatsapp}</span>
              <span className="contact-messaging-cta">{labels.chatNow}</span>
            </a>
          ) : null}

          {wechatId ? (
            <button
              type="button"
              className="contact-messaging-card contact-messaging-card-button"
              onClick={() => setWechatOpen(true)}
            >
              <span className="contact-messaging-icon-wrap" aria-hidden>
                <Image
                  src="/icons/messaging-wechat.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="contact-messaging-icon-img"
                />
              </span>
              <span className="contact-messaging-app-name">{labels.wechat}</span>
              <span className="contact-messaging-cta">{labels.addUs}</span>
            </button>
          ) : null}

          {lineLink ? (
            <a
              href={lineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-messaging-card contact-messaging-card-link"
            >
              <span className="contact-messaging-icon-wrap" aria-hidden>
                <Image
                  src="/icons/messaging-line.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="contact-messaging-icon-img"
                />
              </span>
              <span className="contact-messaging-app-name">{labels.line}</span>
              <span className="contact-messaging-cta">{labels.chatNow}</span>
            </a>
          ) : null}

          {telegramLink ? (
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-messaging-card contact-messaging-card-link"
            >
              <span className="contact-messaging-icon-wrap" aria-hidden>
                <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden>
                  <circle cx="12" cy="12" r="11" fill="#229ED9" />
                  <path fill="#fff" d="M17.5 7.4l-1.6 7.9c-.1.5-.5.7-.9.4l-2.7-2-1.3 1.2c-.1.1-.2.2-.5.2l.2-2.7 4.9-4.4c.2-.2 0-.3-.3-.1L8.4 12l-2.6-.8c-.6-.2-.6-.6.1-.9l10.1-3.9c.5-.2 1 .1.9.9z"/>
                </svg>
              </span>
              <span className="contact-messaging-app-name">{labels.telegram}</span>
              <span className="contact-messaging-cta">{labels.chatNow}</span>
            </a>
          ) : null}
        </div>
      </div>

      {wechatOpen ? (
        <div
          className="contact-wechat-modal-root"
          role="presentation"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setWechatOpen(false);
          }}
        >
          <button
            type="button"
            className="contact-wechat-modal-backdrop"
            aria-label={labels.messagingClose}
            onClick={() => setWechatOpen(false)}
          />
          <div
            className="contact-wechat-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <h3 id={dialogTitleId} className="contact-wechat-modal-title">
              {labels.wechat}
            </h3>
            <p className="contact-wechat-modal-hint">{labels.wechatHint}</p>
            <p className="contact-wechat-modal-id" translate="no">
              {wechatId}
            </p>
            <button ref={closeBtnRef} type="button" className="btn btn-primary contact-wechat-modal-close" onClick={() => setWechatOpen(false)}>
              {labels.messagingClose}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
