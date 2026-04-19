function Header({ title, subtitle }) {
  return (
    <header>
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  );
}

export default Header;
