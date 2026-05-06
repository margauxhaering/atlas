
  const modal = document.getElementById("imgModal");
  const modalImg = document.getElementById("modalImg");
  const img = document.querySelector(".clickable-img");
  const closeBtn = document.querySelector(".close");


  img.onclick = function () {
    modal.style.display = "block";
    modalImg.src = this.src;
  };

  closeBtn.onclick = function () {
    modal.style.display = "none";
  };

  modal.onclick = function (e) {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  };
