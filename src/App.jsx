import { useState, useEffect, useRef } from "react";
import "./App.css";

/* 🛠️ 설정 1: 카테고리 및 파일 목록 관리 
  - files 배열에 public/data/폴더/ 안에 있는 파일명만 적으면 됨
*/
const categoryConfig = {
  english: {
    path: "english",
    label: "ENGLISH MEETING",
    mobileLabel: "ENG", // 모바일용 짧은 이름
    files: ["meetup_001.txt"],
  },
  bookclub: {
    path: "bookclub",
    label: "독서회",
    mobileLabel: "BOOK",
    files: ["book_001.txt"],
  },
  programming: {
    path: "AI",
    label: "AI",
    mobileLabel: "AI",
    files: ["ai_001.txt"],
  },
};

/* 🎵 설정 2: 배경음악 및 유튜브 홍보 
  - playlist: public/data/songs/ 폴더 안에 있는 mp3 파일명
*/
const musicConfig = {
  playlist: ["song1.mp3", "song2.mp3"],
  youtubeLink: "https://www.youtube.com/@DJ_ICE_BREAKING",
};

function App() {
  // 상태 관리
  const [currentCategory, setCurrentCategory] = useState("english");
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // 음악 플레이어 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const audioRef = useRef(null);

  // 1. 데이터 불러오기 (카테고리 변경 시 실행)
  useEffect(() => {
    const loadFiles = async () => {
      const config = categoryConfig[currentCategory];

      // 파일 목록 없으면 초기화
      if (!config.files || config.files.length === 0) {
        setPosts([]);
        setSelectedPost(null);
        return;
      }

      // 파일 내용 비동기로 싹 긁어오기
      const loadedPosts = await Promise.all(
        config.files.map(async (filename) => {
          try {
            // ★ 중요: 배포 환경을 위해 BASE_URL 사용
            const response = await fetch(
              `${import.meta.env.BASE_URL}data/${config.path}/${filename}`,
            );

            if (!response.ok) throw new Error("File not found");

            const text = await response.text();

            // 첫 줄(제목)과 나머지(HTML) 분리
            const splitIndex = text.indexOf("\n");
            const dateTitle =
              splitIndex !== -1
                ? text.substring(0, splitIndex).trim()
                : filename;
            const contentHtml =
              splitIndex !== -1 ? text.substring(splitIndex + 1) : text;

            return { id: filename, title: dateTitle, content: contentHtml };
          } catch (error) {
            return { id: filename, title: "Error", content: "File not found" };
          }
        }),
      );

      setPosts(loadedPosts);
      // 데이터가 있으면 첫 번째 글 자동 선택
      if (loadedPosts.length > 0) {
        setSelectedPost(loadedPosts[0]);
      } else {
        setSelectedPost(null);
      }
    };

    loadFiles();
  }, [currentCategory]);

  // 2. 음악 재생 로직 (곡이 끝나면 다음 곡으로)
  const handleSongEnd = () => {
    const nextIndex = (currentSongIndex + 1) % musicConfig.playlist.length;
    setCurrentSongIndex(nextIndex);
  };

  // 3. Play/Pause 상태 동기화
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => {
          console.log("자동 재생 막힘(사용자 클릭 필요):", e);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSongIndex]);

  // 로딩 화면
  if (!selectedPost && posts.length > 0 && posts[0].title !== "Error")
    return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      {/* 사이드바 (모바일: 상단 네비게이션) */}
      <nav className="sidebar">
        {/* 카테고리 3등분 탭 */}
        <div className="category-selector">
          {Object.keys(categoryConfig).map((key) => (
            <div
              key={key}
              className={`logo-item ${currentCategory === key ? "active" : ""}`}
              onClick={() => setCurrentCategory(key)}
            >
              <span className="desktop-text">{categoryConfig[key].label}</span>
              <span className="mobile-text">
                {categoryConfig[key].mobileLabel}
              </span>
            </div>
          ))}
        </div>

        {/* 파일 목록 (모바일: 가로 스크롤) */}
        <ul className="menu-list">
          {posts.map((post) => (
            <li
              key={post.id}
              className={
                selectedPost && selectedPost.id === post.id ? "active" : ""
              }
              onClick={() => setSelectedPost(post)}
            >
              {post.title}
            </li>
          ))}
        </ul>

        {/* 뮤직 플레이어 (사이드바 하단 고정) */}
        <div className="music-player-box">
          <p className="music-title">
            🎧 BGM (Ballad)
            <br />
            <span style={{ fontSize: "0.8rem", color: "#ffeb3b" }}>
              {musicConfig.playlist[currentSongIndex]}
            </span>
          </p>

          <audio
            ref={audioRef}
            src={`${import.meta.env.BASE_URL}data/songs/${
              musicConfig.playlist[currentSongIndex]
            }`}
            onEnded={handleSongEnd}
          />

          <div className="music-controls">
            <button onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button onClick={handleSongEnd}>⏭ Next</button>
          </div>

          <a
            href={musicConfig.youtubeLink}
            target="_blank"
            className="youtube-link"
            rel="noreferrer"
          >
            📺 유튜브에서 더 듣기
          </a>
        </div>
      </nav>

      {/* 메인 뷰어 (A4 용지) */}
      <main className="main-viewer">
        <div className="paper">
          {selectedPost ? (
            <>
              <h1 className="paper-title">{selectedPost.title}</h1>
              <div
                className="paper-content"
                dangerouslySetInnerHTML={{ __html: selectedPost.content }}
              />
            </>
          ) : (
            <div
              style={{ textAlign: "center", marginTop: "100px", color: "#888" }}
            >
              <p>등록된 모임 일정이 없습니다.</p>
              <p>No meeting schedule yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
