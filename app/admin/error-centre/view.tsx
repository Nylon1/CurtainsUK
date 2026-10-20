'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type Event = { event_id: string; journey_id: string; request_id: string; occurred_at: string; kind: string;
  page_path: string; name: string; code: string | null; status: number | null; release: string; browser: string; channel: string | null };
type Summary = { visits: number; journeys: number; pageViews: number; cartAdds: number;
  cartViews: number; checkoutStarts: number; errors: number; slowEvents: number; paidOrders: number;
  topPages: { path: string; views: number }[]; channels: { name: string; visits: number }[] };
type Payload = { summary: Summary; errors: Event[]; visits: Event[]; timeline: Event[]; slow: Event[];
  selectedJourney: string | null; nextBefore: string | null; retentionDays: number;
  pendingEmailAlerts: number; emailAlertsConfigured: boolean; serviceErrorCount: number;
  serviceErrors: { error_id: string; occurred_at: string; request_id: string; route_path: string;
    code: string; status: number; release: string; source: string }[] };

const date = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const card = 'rounded-2xl border border-[#d7d6c9] bg-white p-5 shadow-sm';

export default function ErrorCentre() {
  const [data, setData] = useState<Payload | null>(null);
  const [failure, setFailure] = useState(false);
  const [days, setDays] = useState<7 | 30>(7);
  const [journey, setJourney] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [notifications, setNotifications] = useState(false);
  const latestVisit = useRef<string | null>(null);
  const fetchBusy = useRef(false);

  const refresh = useCallback(async () => {
    if (fetchBusy.current) return;
    fetchBusy.current = true;
    const query = new URLSearchParams({ days: String(days) });
    if (journey) query.set('journey', journey);
    if (before) query.set('before', before);
    if (latestVisit.current) query.set('since', latestVisit.current);
    try {
      const response = await fetch(`/api/admin/error-centre?${query}`, { cache: 'no-store' });
      if (!response.ok) throw Error('ERROR_CENTRE_UNAVAILABLE');
      const next = await response.json() as Payload;
      if (next.visits.length) {
        const newest = query.has('since') ? next.visits[next.visits.length - 1] : next.visits[0];
        latestVisit.current = newest.occurred_at;
        if (query.has('since')) {
          setNotice(`${next.visits.length} new anonymous ${next.visits.length === 1 ? 'visit' : 'visits'} since your last check`);
          if (notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            for (const visit of next.visits) new Notification('New CurtainsUK visit', { body: `Anonymous visitor opened ${visit.page_path}` });
          }
        }
      }
      else if (!latestVisit.current) latestVisit.current = new Date().toISOString();
      setData((current) => query.has('since') && current ? { ...next, visits: [...next.visits.slice().reverse(), ...current.visits].slice(0, 30) } : next);
      setFailure(false);
    } catch { setFailure(true); }
    finally { fetchBusy.current = false; }
  }, [days, journey, before, notifications]);

  useEffect(() => { void refresh(); const id = window.setInterval(() => void refresh(), 15_000); return () => clearInterval(id); }, [refresh]);

  async function enableNotifications() {
    if (typeof Notification === 'undefined') { setNotice('Browser notifications are unavailable. New visits still appear here.'); return; }
    const permission = await Notification.requestPermission();
    setNotifications(permission === 'granted');
    setNotice(permission === 'granted' ? 'Visit alerts are on while this dashboard is open.' : 'Browser notifications were not allowed. New visits still appear here.');
  }

  return <main className="min-h-screen bg-[#f5f3eb] px-4 py-8 text-[#193d34] sm:px-8">
    <div className="mx-auto max-w-7xl">
      <nav className="mb-6 text-sm"><Link className="underline underline-offset-4" href="/admin">Admin</Link> / Customer Experience</nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#927246]">CurtainsUK operations</p>
          <h1 className="mt-2 font-serif text-4xl">Customer Experience</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#586c61]">Anonymous journeys, shopping steps and errors. Only visits with analytics permission appear here. Shopify checkout is outside this journey view.</p></div>
        <div className="flex flex-wrap gap-2"><button className="rounded-full border border-[#9aab9f] px-4 py-2 text-sm hover:bg-white" onClick={() => void refresh()}>Refresh</button>
          <button className="rounded-full bg-[#173d33] px-4 py-2 text-sm text-white hover:bg-[#295c4c]" onClick={() => void enableNotifications()}>{notifications ? 'Visit alerts on' : 'Enable visit alerts'}</button></div>
      </div>
      {notice && <p role="status" className="mt-5 rounded-xl bg-[#e9efe4] p-3 text-sm">{notice}</p>}
      {data && (!data.emailAlertsConfigured || data.pendingEmailAlerts > 0) && <p role="status" className="mt-5 rounded-xl bg-[#fff0d4] p-3 text-sm">{!data.emailAlertsConfigured ? 'Email visit alerts need a verified sender, recipient and Resend key before release.' : `${data.pendingEmailAlerts} visit email ${data.pendingEmailAlerts === 1 ? 'alert needs' : 'alerts need'} attention.`} Browser alerts remain available here.</p>}
      {failure && <p role="alert" className="mt-5 rounded-xl bg-[#ffe5db] p-3 text-sm">The dashboard could not refresh. Existing data is still shown. <button className="underline" onClick={() => void refresh()}>Try again</button></p>}
      <div className="mt-6 flex gap-2" role="group" aria-label="Reporting period">{([7, 30] as const).map((value) => <button key={value} onClick={() => setDays(value)} aria-pressed={days === value} className={`rounded-full px-4 py-2 text-sm ${days === value ? 'bg-[#173d33] text-white' : 'border border-[#9aab9f] bg-white'}`}>Last {value} days</button>)}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ['New visits', data?.summary?.visits], ['Page views', data?.summary?.pageViews],
        ['Cart additions', data?.summary?.cartAdds], ['Checkout starts', data?.summary?.checkoutStarts],
        ['Cart visits', data?.summary?.cartViews], ['Paid orders', data?.summary?.paidOrders],
        ['Browser/API errors', data?.summary?.errors], ['Service errors', data?.serviceErrorCount],
        ['Slow loads', data?.summary?.slowEvents],
      ].map(([label, value]) => <div className={card} key={String(label)}><p className="text-xs font-semibold uppercase tracking-wider text-[#61756a]">{label}</p><p className="mt-3 font-serif text-3xl">{value ?? '—'}</p></div>)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className={card}><h2 className="font-serif text-2xl">Pages people explore</h2><p className="mt-1 text-sm text-[#61756a]">Consented page views in the selected period, without search terms or URL parameters.</p>
          <ol className="mt-4 space-y-2">{data?.summary?.topPages?.map((page) => <li key={page.path} className="flex justify-between gap-4 border-b border-[#ece9df] py-2 text-sm"><span className="min-w-0 truncate">{page.path}</span><strong>{page.views}</strong></li>)}</ol>
          {data && !data.summary?.topPages?.length && <p className="mt-4 text-sm">No consented visits have been recorded yet.</p>}</section>
        <section className={card}><h2 className="font-serif text-2xl">New visits</h2><p className="mt-1 text-sm text-[#61756a]">A visit starts when a new anonymous browsing session begins. Live alerts work while this page is open.</p>
          <ol className="mt-4 max-h-[430px] space-y-2 overflow-auto">{data?.visits?.map((visit) => <li key={visit.event_id}><button className="flex w-full justify-between gap-3 rounded-lg border border-[#ece9df] p-3 text-left text-sm hover:bg-[#f6f6f0]" onClick={() => setJourney(visit.journey_id)}><span className="truncate">{visit.page_path} <small className="block text-[#6a7b71]">{visit.browser} · {visit.channel ?? 'Unknown source'}</small></span><span className="shrink-0 text-[#6a7b71]">{date(visit.occurred_at)}</span></button></li>)}</ol></section>
      </div>
      <section className={`${card} mt-6`}><h2 className="font-serif text-2xl">Service errors</h2><p className="mt-1 text-sm text-[#61756a]">Handled 5xx responses and unhandled faults across the site. Routes and codes only; request content is never saved here.</p>
        <ol className="mt-4 grid max-h-[500px] gap-2 overflow-auto md:grid-cols-2">{data?.serviceErrors?.map((event) => <li key={event.error_id} className="rounded-lg border border-[#ece9df] p-3 text-sm"><strong>{event.code}</strong><span className="ml-2 text-[#708276]">{date(event.occurred_at)}</span><p className="mt-1 truncate">{event.route_path} · HTTP {event.status}</p><p className="mt-1 truncate text-xs text-[#708276]">Reference {event.request_id} · {event.release.slice(0, 12)}</p></li>)}</ol>
        {data && !data.serviceErrors.length && <p className="mt-4 text-sm">No recent service errors recorded.</p>}</section>
      <section className={`${card} mt-6`}><h2 className="font-serif text-2xl">How people arrive</h2><p className="mt-1 text-sm text-[#61756a]">Broad, consented source categories only. Campaign details and search terms are not stored.</p>
        <div className="mt-4 flex flex-wrap gap-3">{data?.summary?.channels?.map((source) => <div key={source.name} className="min-w-28 rounded-xl bg-[#f4f3eb] p-3"><strong className="block text-xl">{source.visits}</strong><span className="text-sm">{source.name}</span></div>)}</div>
        {data && !data.summary?.channels?.length && <p className="mt-4 text-sm">No source data yet.</p>}</section>
      <section className={`${card} mt-6`}><h2 className="font-serif text-2xl">Slow loading</h2><p className="mt-1 text-sm text-[#61756a]">Pages taking at least 4 seconds to load and app requests taking at least 5 seconds. Timing bands are guides across different devices and connections.</p>
        <ol className="mt-4 grid gap-2 md:grid-cols-2">{data?.slow?.map((event) => <li key={event.event_id} className="rounded-lg border border-[#ece9df] p-3 text-sm"><strong>{event.code}</strong><span className="ml-2 text-[#708276]">{date(event.occurred_at)}</span><p className="mt-1 truncate">{event.page_path} · {event.browser}</p></li>)}</ol>
        {data && !data.slow.length && <p className="mt-4 text-sm">No slow-load reports yet.</p>}</section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className={card}><h2 className="font-serif text-2xl">Customer errors</h2><p className="mt-1 text-sm text-[#61756a]">Safe error codes and affected pages. Select one to inspect its anonymous journey.</p>
          <ol className="mt-4 max-h-[500px] space-y-2 overflow-auto">{data?.errors?.map((event) => <li key={event.event_id}><button className="w-full rounded-lg border border-[#ece9df] p-3 text-left text-sm hover:bg-[#f6f6f0]" onClick={() => setJourney(event.journey_id)}><span className="flex justify-between gap-3"><strong>{event.code}</strong><time className="text-[#6a7b71]">{date(event.occurred_at)}</time></span><span className="mt-1 block truncate text-[#566c60]">{event.page_path} · {event.browser} {event.status ?? ''}</span></button></li>)}</ol>
          {data && !data.errors.length && <p className="mt-4 text-sm">No browser errors recorded in this page of results.</p>}
          {data?.nextBefore && <button className="mt-4 underline" onClick={() => setBefore(data.nextBefore)}>Older errors</button>}</section>
        <section className={card}><div className="flex justify-between gap-3"><h2 className="font-serif text-2xl">Journey timeline</h2>{journey && <button className="text-sm underline" onClick={() => setJourney(null)}>Clear</button>}</div>
          <p className="mt-1 text-sm text-[#61756a]">Pages, cart steps and errors from one browser session. No recording of the screen or personal details.</p>
          {journey ? <ol className="mt-4 max-h-[500px] space-y-2 overflow-auto">{data?.timeline?.map((event) => <li key={event.event_id} className="rounded-lg border border-[#ece9df] p-3 text-sm"><span className="font-semibold">{event.name.replaceAll('_', ' ')}</span><span className="ml-2 text-[#708276]">{date(event.occurred_at)}</span><p className="mt-1 break-all">{event.page_path}{event.code ? ` · ${event.code}` : ''}</p></li>)}</ol> : <p className="mt-6 text-sm">Select a visit or error to see its timeline.</p>}</section>
      </div>
      <p className="py-8 text-xs text-[#66766c]">Journey data is deleted after {data?.retentionDays ?? 30} days. Browser alerts require this dashboard to remain open. Regional visitor data is omitted until a trustworthy source is available.</p>
    </div>
  </main>;
}
