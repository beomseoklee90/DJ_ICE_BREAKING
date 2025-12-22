import { useState, useEffect } from "react";
import "./App.css";

// 🛠️ 설정: 여기에 파일명을 관리해 (경로랑 파일명 매칭)
const categoryConfig = {
  english: {
    path: "english", // 실제 폴더명 (/public/data/english)
    label: "ENGLISH MEETING",
    files: ["meetup_002.txt", "meetup_001.txt"], // 그 폴더 안의 파일들
  },
  japanese: {
    path: "japanese", // 실제 폴더명 (/public/data/japanese)
    label: "日本語集まり",
    files: ["meetup_jp_001.txt"],
  },
  bookclub: {
    path: "bookclub", // 실제 폴더명 (/public/data/bookclub)
    label: "독서회",
    files: ["book_001.txt"],
  },
};

function App() {
  // 현재 선택된 카테고리 (기본값: 영어)
  const [currentCategory, setCurrentCategory] = useState("english");
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    // 카테고리가 바뀔 때마다 실행되는 로직
    const loadFiles = async () => {
      // 1. 현재 카테고리 설정 가져오기
      const config = categoryConfig[currentCategory];

      // 2. 파일 목록이 비어있으면 초기화하고 종료
      if (!config.files || config.files.length === 0) {
        setPosts([]);
        setSelectedPost(null);
        return;
      }

      // 3. 해당 폴더에서 파일 긁어오기
      const loadedPosts = await Promise.all(
        config.files.map(async (filename) => {
          // 경로가 동적으로 바뀜: /data/english/파일.txt
          const response = await fetch(`/data/${config.path}/${filename}`);

          // 파일이 없거나 에러나면 빈 텍스트 처리 (에러 방지)
          if (!response.ok)
            return { id: filename, title: "Error", content: "File not found" };

          const text = await response.text();

          const splitIndex = text.indexOf("\n");
          // 첫 줄이 없으면 파일명으로 대체
          const dateTitle =
            splitIndex !== -1 ? text.substring(0, splitIndex).trim() : filename;
          const contentHtml =
            splitIndex !== -1 ? text.substring(splitIndex + 1) : text;

          return { id: filename, title: dateTitle, content: contentHtml };
        })
      );

      setPosts(loadedPosts);
      // 목록이 있으면 첫 번째 글 자동 선택
      if (loadedPosts.length > 0) {
        setSelectedPost(loadedPosts[0]);
      } else {
        setSelectedPost(null);
      }
    };

    loadFiles();
  }, [currentCategory]); // currentCategory가 바뀔 때마다 재실행

  // 로딩 중이거나 데이터가 없을 때
  if (!selectedPost && posts.length > 0)
    return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <nav className="sidebar">
        {/* 여기가 핵심! 
           단순 텍스트가 아니라 버튼 역할을 하도록 바꿈 
        */}
        <div className="category-selector">
          <h2
            className={`logo-item ${
              currentCategory === "english" ? "active" : ""
            }`}
            onClick={() => setCurrentCategory("english")}
          >
            ENGLISH MEETING
          </h2>
          <h2
            className={`logo-item ${
              currentCategory === "japanese" ? "active" : ""
            }`}
            onClick={() => setCurrentCategory("japanese")}
          >
            日本語集まり
          </h2>
          <h2
            className={`logo-item ${
              currentCategory === "bookclub" ? "active" : ""
            }`}
            onClick={() => setCurrentCategory("bookclub")}
          >
            독서회
          </h2>
        </div>

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

        <div className="ad-box-sidebar">
          <p>📲 Study App</p>
          <button onClick={() => window.open("형의_앱_링크")}>Download</button>
        </div>
      </nav>

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
            // 게시글이 없을 때 보여줄 화면
            <div
              style={{ textAlign: "center", marginTop: "50px", color: "#888" }}
            >
              <p>등록된 모임 일정이 없습니다.</p>
              <p>No meeting schedule yet.</p>
            </div>
          )}

          <div className="ad-box-bottom">
            <p>🎵 Produced by Beomseok</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
