import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { useMuseumContext } from "../context";
import { withLang } from "../routing";

export function MuseumIndexPage() {
  const { locale } = useMuseumContext();
  return (
    <section className="page-shell museum-index-page">
      <header className="page-intro">
        <p className="eyebrow">Museum / 01</p>
        <h1>{locale === "zh-CN" ? "展览" : "Exhibitions"}</h1>
        <p>{locale === "zh-CN" ? "从一个策展问题进入，再沿地图、时间、人物和原典继续探索。" : "Begin with a curatorial question, then continue through place, time, figures and primary texts."}</p>
      </header>
      <Link className="exhibition-poster" to={withLang("/museum/changan-three-traditions", locale)}>
        <div className="poster-index">01</div>
        <div>
          <span>{locale === "zh-CN" ? "隋唐专题展" : "Sui–Tang exhibition"}</span>
          <h2>{locale === "zh-CN" ? "长安：三教相遇的世界之都" : "Chang'an: Where the Three Traditions Met"}</h2>
          <p>{locale === "zh-CN" ? "佛教的译经与传播、道教的宫观与皇室、儒家的礼制与教育，在一座帝国城市中相遇。" : "Buddhist translation, Daoist institutions and Confucian state learning meet in an imperial capital."}</p>
        </div>
        <Icon name="arrow" size={28} />
      </Link>
      <div className="coming-exhibitions">
        <span>02</span>
        <p>{locale === "zh-CN" ? "神话宇宙与文明原型（规划中）" : "Mythic cosmos and civilisational archetypes (planned)"}</p>
        <span>03</span>
        <p>{locale === "zh-CN" ? "经典之声（规划中）" : "Voices of the classics (planned)"}</p>
      </div>
    </section>
  );
}
