import { useState, useEffect, useRef } from "react";
import VueSandbox, { DEFAULT_VUE_CODE } from "./VueSandbox";
import "./App.css";

/* 🛠️ 설정 1: 카테고리 및 파일 목록 관리
  - files 배열에 public/data/폴더/ 안에 있는 파일명(.txt / .html)을 적으면 됨
*/
const categoryConfig = {
  vue: {
    path: "vue",
    label: "💻 Vue 3 실전",
    mobileLabel: "Vue 3",
    files: [
      "00_reference.html",
      "01_signup_form.html",
      "02_board_crud.html",
      "03_todo_priority.html",
      "04_shopping_cart.html",
      "05_tab_accordion.html",
      "06_poll_survey.html",
      "07_stopwatch_timer.html",
      "08_quiz_flashcard.html",
      "09_expense_tracker.html",
      "10_admin_dashboard.html",
    ],
  },
};

/* 🎵 설정 2: 배경음악 및 유튜브 홍보 */
const musicConfig = {
  playlist: ["track2.mp3", "track1.mp3", "track3.mp3", "track4.mp3"],
  youtubeLink: "https://www.youtube.com/@DJ_ICE_BREAKING",
};

function App() {
  const [currentCategory, setCurrentCategory] = useState("vue");
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // 상단 자동 숨김 네비게이션 상태
  const [isNavOpen, setIsNavOpen] = useState(false);

  // 모바일 3단 세그먼트 탭 상태: 'doc' | 'editor' | 'preview'
  const [mobileTab, setMobileTab] = useState("doc");

  // Vue 에디터 코드 상태
  const [editorCode, setEditorCode] = useState(DEFAULT_VUE_CODE);
  const [toastMsg, setToastMsg] = useState("");

  // 음악 플레이어 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const audioRef = useRef(null);
  const paperContentRef = useRef(null);

  // 1. 데이터 불러오기 (.txt 및 .html 모두 지원)
  useEffect(() => {
    const loadFiles = async () => {
      const config = categoryConfig[currentCategory];

      if (!config || !config.files || config.files.length === 0) {
        setPosts([]);
        setSelectedPost(null);
        return;
      }

      const loadedPosts = await Promise.all(
        config.files.map(async (filename) => {
          try {
            const response = await fetch(
              `${import.meta.env.BASE_URL}data/${config.path}/${filename}`
            );
            if (!response.ok) throw new Error("File not found");

            const text = await response.text();
            const splitIndex = text.indexOf("\n");
            const dateTitle =
              splitIndex !== -1
                ? text.substring(0, splitIndex).trim()
                : filename;
            const contentHtml =
              splitIndex !== -1 ? text.substring(splitIndex + 1) : text;

            return { id: filename, title: dateTitle, content: contentHtml };
          } catch {
            return { id: filename, title: "Error", content: "File not found" };
          }
        })
      );

      setPosts(loadedPosts);
      if (loadedPosts.length > 0) {
        setSelectedPost(loadedPosts[0]);
      } else {
        setSelectedPost(null);
      }
    };

    loadFiles();
  }, [currentCategory]);

  // 2. 교재 내 [우측 에디터로 보내기 ➔] 버튼 클릭 이벤트 위임
  useEffect(() => {
    const container = paperContentRef.current;
    if (!container) return;

    const handleClick = (e) => {
      const btn = e.target.closest(".send-to-editor-btn");
      if (!btn) return;

      const targetId = btn.getAttribute("data-code-target");
      let codeText = "";

      if (targetId) {
        const targetEl = container.querySelector(`#${targetId}`);
        if (targetEl) {
          codeText = targetEl.textContent || "";
        }
      } else {
        const wrapper = btn.closest(".code-block-wrapper");
        const preEl = wrapper ? wrapper.querySelector("pre") : null;
        if (preEl) {
          codeText = preEl.textContent || "";
        }
      }

      if (codeText.trim()) {
        setEditorCode(codeText.trim());
        setToastMsg("에디터에 코드가 적용되었습니다!");
        setTimeout(() => setToastMsg(""), 2000);
        if (window.innerWidth <= 768) {
          setMobileTab("editor");
        }
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [selectedPost]);

  // 3. 음악 재생 로직
  const handleSongEnd = () => {
    const nextIndex = (currentSongIndex + 1) % musicConfig.playlist.length;
    setCurrentSongIndex(nextIndex);
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSongIndex]);

  return (
    <div className="app-shell">
      {/* 상단 4px 마우스 트리거 영역 */}
      <div
        className="top-hover-trigger"
        onMouseEnter={() => setIsNavOpen(true)}
      />

      {/* 상단 중앙 핸들/인디케이터 */}
      <button
        type="button"
        className={`top-nav-handle ${isNavOpen ? "hidden" : ""}`}
        onClick={() => setIsNavOpen(true)}
        onMouseEnter={() => setIsNavOpen(true)}
        title="메뉴 열기"
      >
        <span className="handle-bar" />
        <span className="handle-label">☰ 메뉴 / 강의 목차 / BGM</span>
      </button>

      {/* 상단 자동 숨김 네비게이션 바 */}
      <header
        className={`top-navbar ${isNavOpen ? "open" : ""}`}
        onMouseLeave={() => setIsNavOpen(false)}
      >
        <div className="navbar-left">
          <div className="category-tabs">
            {Object.keys(categoryConfig).map((key) => (
              <button
                key={key}
                type="button"
                className={`cat-tab ${currentCategory === key ? "active" : ""}`}
                onClick={() => setCurrentCategory(key)}
              >
                {categoryConfig[key].label}
              </button>
            ))}
          </div>

          <select
            className="lesson-select"
            value={selectedPost ? selectedPost.id : ""}
            onChange={(e) => {
              const found = posts.find((p) => p.id === e.target.value);
              if (found) setSelectedPost(found);
            }}
          >
            {posts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title}
              </option>
            ))}
          </select>
        </div>

        <div className="navbar-right">
          <div className="bgm-compact">
            <span className="bgm-track" title={musicConfig.playlist[currentSongIndex]}>
              🎧 {musicConfig.playlist[currentSongIndex]}
            </span>
            <button
              type="button"
              className="bgm-btn"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              className="bgm-btn"
              onClick={handleSongEnd}
              title="다음 곡"
            >
              ⏭
            </button>
            <a
              href={musicConfig.youtubeLink}
              target="_blank"
              rel="noreferrer"
              className="bgm-yt"
              title="유튜브에서 더 듣기"
            >
              📺
            </a>
          </div>

          <button
            type="button"
            className="nav-close-btn"
            onClick={() => setIsNavOpen(false)}
            title="네비게이션 닫기"
          >
            ✕
          </button>
        </div>

        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}data/songs/${
            musicConfig.playlist[currentSongIndex]
          }`}
          onEnded={handleSongEnd}
        />
      </header>

      {/* 모바일 전용 3단 세그먼트 탭 (768px 이하) */}
      <div className="mobile-segment-bar">
        <button
          type="button"
          className={`segment-btn ${mobileTab === "doc" ? "active" : ""}`}
          onClick={() => setMobileTab("doc")}
        >
          📖 교재 보기
        </button>
        <button
          type="button"
          className={`segment-btn ${mobileTab === "editor" ? "active" : ""}`}
          onClick={() => setMobileTab("editor")}
        >
          💻 코드 입력
        </button>
        <button
          type="button"
          className={`segment-btn ${mobileTab === "preview" ? "active" : ""}`}
          onClick={() => setMobileTab("preview")}
        >
          📱 실행 결과
        </button>
      </div>

      {/* 메인 50:50 분할 워크스페이스 */}
      <main className={`workspace mobile-tab-${mobileTab}`}>
        {/* 좌측 50%: 교재 뷰어 */}
        <section className="pane-left">
          <div className="paper">
            {selectedPost ? (
              <>
                <h1 className="paper-title">{selectedPost.title}</h1>
                <div
                  ref={paperContentRef}
                  className="paper-content"
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                />
              </>
            ) : (
              <div className="empty-state">
                <p>등록된 교재가 없습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* 우측 50%: Vue 3 실시간 실습 샌드박스 */}
        <section className="pane-right">
          <VueSandbox
            code={editorCode}
            onChangeCode={setEditorCode}
            onResetCode={() => setEditorCode(DEFAULT_VUE_CODE)}
          />
        </section>
      </main>

      {toastMsg && <div className="toast-banner">{toastMsg}</div>}
    </div>
  );
}

export default App;
