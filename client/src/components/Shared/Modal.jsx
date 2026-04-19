function Modal({ title, children }) {
  return (
    <section className="card" aria-label={title}>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

export default Modal;
