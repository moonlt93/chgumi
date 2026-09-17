'use client';

import './life.css';

import {
  Armchair,
  BookOpen,
  Check,
  ChevronRight,
  Coins,
  Home,
  Leaf,
  LoaderCircle,
  Plus,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Category } from '@/domain/life/catalog';
import { CATEGORIES, FEELINGS, PERSONAS, REWARDS, SHOP } from '@/domain/life/catalog';
import type { LifeState } from '@/domain/life/model';

import { CoachPanel } from './CoachPanel';
import { Room } from './Room';

type Payload = { state: LifeState; today: string; aiAvailable: boolean; photoAvailable: boolean };
type Tab = 'room' | 'today' | 'history' | 'shop';
const categoryNames = { outfit: '코디 입어 보기', activity: '작은 활동', journal: '오늘의 기록' };

export function LifeApp() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [tab, setTab] = useState<Tab>('room');
  const [settings, setSettings] = useState(false);
  const [closet, setCloset] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [record, setRecord] = useState<{ id: string; category: Category; title: string } | null>(
    null,
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/life', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('데이터를 불러오지 못했습니다. 다시 시도해 주세요.');
      }
      setData(await response.json());
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/life', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('데이터를 불러오지 못했습니다. 다시 시도해 주세요.');
        }
        return response.json() as Promise<Payload>;
      })
      .then(setData)
      .catch((failure: Error) => {
        if (failure.name !== 'AbortError') {
          setError(failure.message);
        }
      });
    return () => controller.abort();
  }, []);

  async function act(body: Record<string, unknown>, message: string) {
    if (lock.current) {
      return false;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || '저장하지 못했습니다.');
      }
      setData(payload);
      setNotice(message);
      return true;
    } catch (failure) {
      setError((failure as Error).message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function begin(category: Category, title: string) {
    setRecord({ id: crypto.randomUUID(), category, title });
    setNotice('');
  }

  if (!data) {
    return (
      <div className="life-app life-loading">
        <Leaf size={32} />
        <h1>나의 작은 변화가 자라는 곳</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => void load()}>다시 불러오기</button>
          </>
        ) : (
          <p>방을 준비하고 있어요…</p>
        )}
      </div>
    );
  }
  const { state, today, aiAvailable, photoAvailable } = data;
  const persona = PERSONAS.find((item) => item.id === state.profile?.persona) || PERSONAS[0];
  const level = Math.floor(state.xp / 100) + 1;
  const rewarded = (category: Category) =>
    state.ledger.some((entry) => entry.key === `reward:${today}:${category}`);
  const previewItem = SHOP.find((item) => item.id === preview);
  const equipment = previewItem
    ? { ...state.equipped, [previewItem.slot]: previewItem.id }
    : state.equipped;

  return (
    <div className="life-app">
      <header className="life-header">
        <Link href="/" aria-label="추구미 홈">
          <Leaf size={18} /> CHUGUMI<span>추구미 관리하는 남자</span>
        </Link>
        <span className="coin-badge">
          <Coins size={15} /> {state.coins}
        </span>
      </header>
      {error && (
        <div className="life-error" role="alert">
          {error}
          <button aria-label="오류 닫기" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="life-notice" role="status">
          <Check size={16} />
          {notice}
          <button aria-label="알림 닫기" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {!state.profile || settings ? (
        <section className="life-content onboarding">
          <span className="eyebrow">A LITTLE MORE LIKE ME</span>
          <h1>
            어떤 내가
            <br />
            되고 싶나요?
          </h1>
          <p className="muted">
            완벽하지 않아도 괜찮아요.
            <br />
            작은 실천부터 함께 쌓아가요.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (
                await act(
                  {
                    action: 'profile',
                    name: form.get('name'),
                    persona: form.get('persona'),
                    aspiration: form.get('aspiration'),
                  },
                  '나의 방향을 저장했어요.',
                )
              ) {
                setSettings(false);
              }
            }}
          >
            <label className="field">
              나를 부를 이름
              <input
                name="name"
                required
                maxLength={20}
                placeholder="어떤 이름으로 불러드릴까요?"
                defaultValue={state.profile?.name}
              />
            </label>
            <fieldset className="persona-options">
              <legend>내가 향하고 싶은 방향</legend>
              {PERSONAS.map((item) => (
                <label key={item.id}>
                  <input
                    type="radio"
                    name="persona"
                    value={item.id}
                    defaultChecked={item.id === persona.id}
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="field">
              나에게 남기는 한 문장 <small>선택</small>
              <textarea
                name="aspiration"
                maxLength={160}
                placeholder="예: 편안하지만 단정한 나로 살아가기"
                defaultValue={state.profile?.aspiration}
              />
            </label>
            <button className="primary" disabled={busy}>
              {state.profile ? '변경 저장' : '내 작은 방 만들기'}
              <ChevronRight size={18} />
            </button>
            {state.profile && (
              <button type="button" className="secondary" onClick={() => setSettings(false)}>
                돌아가기
              </button>
            )}
          </form>
          <p className="footnote">
            이 브라우저에 연결된 기록은 서버에 저장돼요. 쿠키를 지우거나 다른 기기에서는
            이어볼 수 없어요.
          </p>
        </section>
      ) : (
        <>
          {tab === 'room' && (
            <section className="life-content">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">MY LITTLE ROOM</span>
                  <h1>{state.profile.name}의 작은 방</h1>
                </div>
                <button className="text-button" onClick={() => setSettings(true)}>
                  나의 방향
                </button>
              </div>
              <p className="muted">{state.profile.aspiration || persona.description}</p>
              <div className="level-row">
                <span>
                  Lv. {level} <b>{persona.name}</b>
                </span>
                <small>{state.xp % 100} / 100 XP</small>
              </div>
              <progress value={state.xp % 100} max={100} aria-label="다음 레벨까지 경험치" />
              <Room equipped={equipment} />
              <div className="room-caption">
                <span>
                  {previewItem ? `${previewItem.name} 미리보기` : '작은 실천이 쌓이는 나만의 공간'}
                </span>
                {previewItem && (
                  <button className="text-button" onClick={() => setPreview(null)}>
                    미리보기 닫기
                  </button>
                )}
              </div>
              <button className="secondary" onClick={() => setCloset(!closet)}>
                <Armchair size={17} />
                {closet ? '보관함 닫기' : '방과 캐릭터 꾸미기'}
              </button>
              {closet && (
                <div className="inventory">
                  <h2>내가 모은 물건</h2>
                  {!state.owned.length && (
                    <p className="muted">첫 실천을 기록하고 숍에서 작은 선물을 골라보세요.</p>
                  )}
                  {SHOP.filter((item) => state.owned.includes(item.id)).map((item) => (
                    <div className="inventory-row" key={item.id}>
                      <span>
                        {item.icon} {item.name}
                      </span>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          const equipped = state.equipped[item.slot] === item.id;
                          if (
                            await act(
                              {
                                action: equipped ? 'unequip' : 'equip',
                                itemId: item.id,
                                slot: item.slot,
                              },
                              equipped ? '보관함에 넣었어요.' : '나의 공간에 적용했어요.',
                            )
                          ) {
                            setPreview(null);
                          }
                        }}
                      >
                        {state.equipped[item.slot] === item.id ? '해제' : '적용'}
                      </button>
                    </div>
                  ))}
                  <button className="text-button" onClick={() => setTab('shop')}>
                    숍 구경하기 →
                  </button>
                </div>
              )}
              <button className="today-banner" onClick={() => setTab('today')}>
                <span className="banner-icon">
                  <Sparkles size={21} />
                </span>
                <span>
                  <strong>오늘, 나를 위한 작은 실천</strong>
                  <small>코디를 입어보거나 하루를 남겨보세요</small>
                </span>
                <ChevronRight size={18} />
              </button>
              <div className="stats-row">
                <span>
                  <b>{state.entries.length}</b> 쌓인 기록
                </span>
                <span>
                  <b>{state.xp}</b> 누적 경험치
                </span>
                <span>
                  <b>{state.owned.length}</b> 나의 물건
                </span>
              </div>
            </section>
          )}
          {tab === 'today' && (
            <section className="life-content">
              <span className="eyebrow">ONE SMALL STEP</span>
              <h1>오늘은 이 정도면 충분해요</h1>
              <p className="muted">
                {persona.name}, 오늘의 작은 제안.
                <br />
                마음에 드는 것부터, 내 속도로 해보세요.
              </p>
              <CoachPanel
                key={JSON.stringify([state.profile, state.entries])}
                available={aiAvailable}
                onRecord={begin}
              />
              <span className="demo-tag">데모 · 준비된 코디와 활동 제안</span>
              <article className="outfit-card">
                <div className="outfit-photo">
                  <img
                    src="/test/virtual-try-on/autumn-01/try-on-sample.png"
                    alt="올리브 오버셔츠와 차콜 바지의 가을 코디 샘플"
                  />
                  <span>샘플 착장</span>
                </div>
                <div className="card-copy">
                  <span className="eyebrow">TODAY'S OUTFIT</span>
                  <h2>차분한 가을의 시작</h2>
                  <p>
                    올리브 셔츠 + 어두운 바지.
                    <br />
                    가진 옷으로 비슷한 색을 맞춰봐요.
                  </p>
                  <span className="reward">
                    {rewarded('outfit') ? '오늘 코디 보상 받음' : '+20 XP · 20 코인'}
                  </span>
                  <button
                    className="primary"
                    onClick={() => begin('outfit', '차분한 가을 코디 입어 보기')}
                  >
                    입어 봤어요
                  </button>
                </div>
              </article>
              {photoAvailable ? (
                <Link className="secondary" href="/photo">
                  내 사진으로 AI 코디 만들기 →
                </Link>
              ) : (
                <p className="footnote">
                  샘플로 모든 기록·성장·꾸미기를 체험할 수 있어요. 실제 사진 생성은 API 키 설정 후
                  사용할 수 있어요.
                </p>
              )}
              <article className="activity-card">
                <span className="activity-symbol">
                  <Leaf size={25} />
                </span>
                <h2>{persona.activity}</h2>
                <p>내 방향에 맞춰 오늘 잠깐 실천할 수 있는 일이에요.</p>
                <span className="reward">
                  {rewarded('activity') ? '오늘 활동 보상 받음' : '+20 XP · 20 코인'}
                </span>
                <button className="secondary" onClick={() => begin('activity', persona.activity)}>
                  해봤어요 · 기록하기
                </button>
              </article>
              <button className="journal-button" onClick={() => begin('journal', '')}>
                <Plus size={19} />
                <span>
                  내가 한 일 직접 기록하기<small>오늘의 기록 보상 +10 XP · 10 코인</small>
                </span>
              </button>
              <p className="footnote">
                보상은 한국 시간 기준 종류별 하루 1회예요. 같은 일을 다른 종류로 중복 기록하기보다
                서로 다른 실천을 남겨주세요. 기록을 지워도 받은 보상 이력은 유지돼요.
              </p>
            </section>
          )}
          {tab === 'history' && (
            <section className="life-content">
              <span className="eyebrow">MY DAYS, MY PACE</span>
              <h1>조금씩 바뀌는 나</h1>
              <p className="muted">작아 보여도, 모두 내가 해낸 일이에요.</p>
              <div className="stats-row">
                <span>
                  <b>{state.entries.length}</b>개의 기록
                </span>
                <span>
                  <b>{new Set(state.entries.map((entry) => entry.day)).size}</b>일의 실천
                </span>
              </div>
              <div className="filter-row">
                <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                  전체
                </button>
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    aria-pressed={filter === category}
                    onClick={() => setFilter(category)}
                  >
                    {categoryNames[category]}
                  </button>
                ))}
              </div>
              {state.entries.length === 0 && (
                <div className="empty-state">
                  <BookOpen size={32} />
                  <h2>아직 빈 페이지예요</h2>
                  <p>오늘 한 일을 하나 남겨볼까요?</p>
                  <button className="primary" onClick={() => begin('journal', '')}>
                    첫 기록 남기기
                  </button>
                </div>
              )}
              {[...state.entries]
                .reverse()
                .filter((entry) => filter === 'all' || entry.category === filter)
                .map((entry) => (
                  <article className="entry-card" key={entry.id}>
                    <div className="entry-meta">
                      <span>
                        {entry.day} · {categoryNames[entry.category]}
                      </span>
                      <span>{entry.feeling}</span>
                    </div>
                    <h2>{entry.title}</h2>
                    {editing === entry.id ? (
                      <form
                        onSubmit={async (event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          if (
                            await act(
                              { action: 'edit', id: entry.id, note: form.get('note') },
                              '기록을 수정했어요. 보상은 그대로예요.',
                            )
                          ) {
                            setEditing(null);
                          }
                        }}
                      >
                        <label className="field">
                          기록 수정
                          <textarea name="note" maxLength={1000} defaultValue={entry.note} />
                        </label>
                        <button disabled={busy}>저장</button>
                        <button type="button" onClick={() => setEditing(null)}>
                          취소
                        </button>
                      </form>
                    ) : (
                      <>
                        <p className="entry-note">{entry.note || '오늘의 작은 실천을 남겼어요.'}</p>
                        <div className="entry-actions">
                          <button onClick={() => setEditing(entry.id)}>수정</button>
                          <button onClick={() => setDeleting(entry.id)}>삭제</button>
                        </div>
                      </>
                    )}
                    {deleting === entry.id && (
                      <div className="delete-confirm">
                        <p>기록을 삭제할까요? 보상 이력은 유지돼요.</p>
                        <button
                          disabled={busy}
                          onClick={async () => {
                            if (
                              await act({ action: 'delete', id: entry.id }, '기록을 삭제했어요.')
                            ) {
                              setDeleting(null);
                            }
                          }}
                        >
                          삭제 확인
                        </button>
                        <button onClick={() => setDeleting(null)}>취소</button>
                      </div>
                    )}
                  </article>
                ))}
            </section>
          )}
          {tab === 'shop' && (
            <section className="life-content">
              <span className="eyebrow">A GIFT TO MYSELF</span>
              <h1>나에게 주는 작은 선물</h1>
              <p className="muted">
                실천으로 모은 코인으로
                <br />내 공간과 캐릭터에 취향을 더해요.
              </p>
              <div className="shop-info">
                <Coins size={18} />
                <strong>{state.coins} 코인</strong>
                <span>실천으로만 모아요 · 현금 결제 없음</span>
              </div>
              <div className="shop-grid">
                {SHOP.map((item) => (
                  <article className="product-card" key={item.id}>
                    <div className="product-art" style={{ background: `${item.color}22` }}>
                      <span>{item.icon}</span>
                      {state.owned.includes(item.id) && <small>보유 중</small>}
                    </div>
                    <h2>{item.name}</h2>
                    <p>{item.description}</p>
                    <strong className="price">{item.price} 코인</strong>
                    <div className="product-actions">
                      <button
                        onClick={() => {
                          setPreview(item.id);
                          setTab('room');
                        }}
                      >
                        미리보기
                      </button>
                      <button
                        disabled={busy || state.owned.includes(item.id)}
                        onClick={() =>
                          void act(
                            { action: 'buy', itemId: item.id },
                            `보관함에 ${item.name} 추가! 내 방에서 적용해 보세요.`,
                          )
                        }
                      >
                        {state.owned.includes(item.id) ? '보유' : '구매'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          <nav className="life-nav" aria-label="주요 메뉴">
            {(
              [
                { id: 'room', title: '내 방', Icon: Home },
                { id: 'today', title: '오늘', Icon: Sparkles },
                { id: 'history', title: '기록', Icon: BookOpen },
                { id: 'shop', title: '숍', Icon: ShoppingBag },
              ] as const
            ).map(({ id, title, Icon }) => (
              <button
                key={id}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => {
                  setTab(id);
                  setNotice('');
                  setError('');
                  setPreview(null);
                }}
              >
                <Icon size={21} />
                <span>{title}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      {record && (
        <div className="record-overlay">
          <section
            className="record-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-heading"
          >
            <button
              className="close-sheet"
              aria-label="기록 닫기"
              disabled={busy}
              onClick={() => setRecord(null)}
            >
              <X size={22} />
            </button>
            <span className="eyebrow">A MOMENT FOR ME</span>
            <h2 id="record-heading">오늘 해낸 일을 남겨요</h2>
            <p className="muted">짧은 한 줄이어도 충분해요.</p>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const reward = REWARDS[record.category];
                const message = rewarded(record.category)
                  ? '기록을 남겼어요. 오늘 이 종류의 보상은 이미 받았어요.'
                  : `작은 실천을 응원해요! +${reward.xp} XP · +${reward.coins} 코인`;
                if (
                  await act(
                    {
                      action: 'record',
                      ...record,
                      title: form.get('title'),
                      note: form.get('note'),
                      feeling: form.get('feeling'),
                    },
                    message,
                  )
                ) {
                  setRecord(null);
                  setTab('history');
                }
              }}
            >
              <label className="field">
                무엇을 했나요?
                <input
                  name="title"
                  required
                  autoFocus
                  maxLength={100}
                  defaultValue={record.title}
                  placeholder="오늘 나를 위해 한 일"
                />
              </label>
              <label className="field">
                어땠나요? <small>선택</small>
                <textarea
                  name="note"
                  maxLength={1000}
                  placeholder="좋았던 점, 다음에 바꾸고 싶은 점…"
                />
              </label>
              <fieldset className="feeling-options">
                <legend>오늘의 느낌</legend>
                {FEELINGS.map((feeling, index) => (
                  <label key={feeling}>
                    <input
                      name="feeling"
                      type="radio"
                      value={feeling}
                      defaultChecked={index === 0}
                    />
                    <span>{feeling}</span>
                  </label>
                ))}
              </fieldset>
              <p className="footnote">
                {rewarded(record.category)
                  ? '오늘 같은 종류의 보상을 이미 받았어요. 기록은 계속 남길 수 있어요.'
                  : `저장하면 ${REWARDS[record.category].xp} XP와 ${REWARDS[record.category].coins} 코인을 받아요.`}
              </p>
              <button className="primary" disabled={busy}>
                {busy ? <LoaderCircle size={18} /> : <Check size={18} />}기록 저장하기
              </button>
            </form>
            {error && (
              <p role="alert" className="sheet-error">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
