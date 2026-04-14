'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';

export type ContactMessagingLabels = {
  messagingTitle: string;
  whatsapp: string;
  wechat: string;
  line: string;
  chatNow: string;
  addUs: string;
  wechatHint: string;
  messagingClose: string;
};

type Props = {
  whatsappLink: string;
  wechatId: string;
  lineLink: string;
  labels: ContactMessagingLabels;
};

export function ContactMessagingSection({ whatsappLink, wechatId, lineLink, labels }: Props) {
  const [wechatOpen, setWechatOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = useId();

  const hasAny = Boolean(whatsappLink || wechatId || lineLink);

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
