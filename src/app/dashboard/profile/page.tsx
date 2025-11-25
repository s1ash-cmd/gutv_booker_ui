import Link from "next/link";

const Home = () => {
  return (
    <div>
      <h1>profile</h1>

      <ul>
        <li>
          <Link href="profile/1">user 1</Link>
        </li>
        <li>
          <Link href="profile/2">user 2</Link>
        </li>
        <li>
          <Link href="profile/3">user 3</Link>
        </li>
        <li>
          <Link href="profile/4">user 4</Link>
        </li>
      </ul>
    </div>
  );
};

export default Home;
