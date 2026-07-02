import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaComments, FaPaperPlane, FaTimes, FaExternalLinkAlt, FaTrashAlt } from 'react-icons/fa';
import { chatbotAPI } from '../services/api';

const starterPrompts = [
  'Create lease for Atlas Bio Labs at 900 Innovation Dr monthly rent 48500 14000 sf.',
  'List leases.',
  'Add escalation for Atlas Bio Labs current rent 48500 rate 3% annual.',
  'Run lease comparison for ids 1, 2, 3.',
  'Run lease audit for lease id 1.'
];

const routeLabels = {
  '/leases': 'Leases',
  '/escalations': 'Escalations',
  '/negotiations': 'Negotiations',
  '/portfolio': 'Portfolio',
  '/market-comps': 'Market Comps',
  '/alerts': 'Alerts'
};

const compactRecord = (item) => {
  if (!item) return null;
  const record = item.record || {};
  const subtitle = record.propertyAddress || record.propertyName || record.tenantName || '';
  return (
    <div className="mt-3 rounded-lg border border-dark-700/70 bg-dark-950/70 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-dark-500">Record #{item.id}</div>
      <div className="mt-1 text-sm font-semibold text-white">{item.title}</div>
      {subtitle && <div className="mt-1 text-xs leading-5 text-dark-400">{subtitle}</div>}
      {item.route && (
        <Link to={item.route} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-300 hover:text-primary-200">
          Open {routeLabels[item.route] || 'section'}
          <FaExternalLinkAlt className="h-2.5 w-2.5" />
        </Link>
      )}
    </div>
  );
};

const BotMessage = ({ message }) => {
  const response = message.response || {};
  const items = response.items || (response.item ? [response.item] : []);
  const result = response.result || {};

  return (
    <div className="rounded-xl border border-dark-700/70 bg-dark-900/80 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary-300">
        {response.action || 'Assistant'}
      </div>
      <div className="mt-1 text-sm leading-5 text-dark-100">
        {response.message || response.error || 'Action completed.'}
      </div>
      {items.slice(0, 3).map((item) => (
        <React.Fragment key={`${item.id}-${item.title}`}>
          {compactRecord(item)}
        </React.Fragment>
      ))}
      {response.action === 'run_ai' && (
        <div className="mt-3 rounded-lg border border-primary-500/30 bg-primary-500/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary-300">
            {response.workflow || 'AI workflow'} · {response.provider || 'OpenRouter'}
          </div>
          {(result.recommendations || result.legalRisks || result.riskFactors) && (
            <div className="mt-2 text-xs leading-5 text-dark-200">
              Structured analysis is available. Open AI Lab for the full report view.
            </div>
          )}
        </div>
      )}
      {response.deletedId && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          Deleted record ID {response.deletedId}.
        </div>
      )}
    </div>
  );
};

const FloatingChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (!open || historyLoaded) return;
    let cancelled = false;
    const loadHistory = async () => {
      try {
        const { data } = await chatbotAPI.getHistory();
        if (cancelled) return;
        const loaded = [];
        [...data].reverse().forEach((entry) => {
          loaded.unshift({ id: `u-${entry.id}`, role: 'user', text: entry.prompt });
          loaded.unshift({ id: `b-${entry.id}`, role: 'bot', response: entry.response || { message: 'No response saved.' } });
        });
        setMessages(loaded);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    };
    loadHistory();
    return () => { cancelled = true; };
  }, [open, historyLoaded]);

  const send = async (text = input) => {
    const prompt = text.trim();
    if (!prompt || loading) return;

    setLoading(true);
    setInput('');
    const id = Date.now();
    setMessages((prev) => [{ id, role: 'user', text: prompt }, ...prev]);

    try {
      const { data } = await chatbotAPI.sendMessage(prompt);
      setMessages((prev) => [{ id: id + 1, role: 'bot', response: data }, ...prev]);
    } catch (error) {
      setMessages((prev) => [
        {
          id: id + 1,
          role: 'bot',
          response: {
            action: 'error',
            message: error.response?.data?.error || error.message || 'Assistant request failed.'
          }
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    send();
  };

  const clearHistory = async () => {
    if (loading) return;
    try {
      await chatbotAPI.clearHistory();
      setMessages([]);
      setHistoryLoaded(true);
    } catch (error) {
      setMessages((prev) => [
        {
          id: Date.now(),
          role: 'bot',
          response: {
            action: 'error',
            message: error.response?.data?.error || error.message || 'Could not clear chatbot history.'
          }
        },
        ...prev
      ]);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open && (
        <div className="mb-4 flex h-[min(620px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-dark-700 bg-dark-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-dark-800 px-4 py-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary-300">App Chatbot</div>
              <div className="text-sm font-bold text-white">Command any table</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearHistory}
                className="rounded-lg p-2 text-dark-400 transition hover:bg-red-500/15 hover:text-red-300"
                aria-label="Clear chatbot history"
                title="Clear history"
              >
                <FaTrashAlt className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-dark-400 transition hover:bg-dark-800 hover:text-white"
                aria-label="Close chatbot"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="border-b border-dark-800 px-4 py-3">
            <div className="grid gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-lg border border-dark-700 bg-dark-900/80 px-3 py-2 text-left text-xs leading-5 text-dark-200 transition hover:border-primary-500/50 hover:bg-primary-500/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-dark-700 bg-dark-900/40 p-4 text-sm leading-6 text-dark-300">
                Create, list, update, or delete leases, escalations, negotiations, portfolio assets, market comps, and alerts without leaving this page.
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-3">
                {messages.map((message) => (
                  message.role === 'user' ? (
                    <div key={message.id} className="ml-8 rounded-xl bg-primary-600 px-3 py-2 text-sm leading-5 text-white">
                      {message.text}
                    </div>
                  ) : (
                    <BotMessage key={message.id} message={message} />
                  )
                ))}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-dark-800 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-dark-700 bg-dark-900 px-3 py-2 text-sm text-white placeholder:text-dark-500 focus:border-primary-500 focus:outline-none"
                placeholder="Type a command..."
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send chatbot command"
              >
                <FaPaperPlane className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-primary-400/40 bg-primary-600 text-white shadow-2xl shadow-primary-950/50 transition hover:bg-primary-500"
        aria-label={open ? 'Close chatbot' : 'Open chatbot'}
      >
        {open ? <FaTimes className="h-5 w-5" /> : <FaComments className="h-5 w-5" />}
      </button>
    </div>
  );
};

export default FloatingChatbot;
