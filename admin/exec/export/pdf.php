<?PHP
include('artnum/autoload.php');

class HorairePDF extends artnum\PDF {
  function __construct($options = array()) {
    parent::__construct();
    $this->SetMargins(15, 40, 10);
    $this->SetFont('helvetica');
  }

  function Header() {
    $this->SetXY(15, 15);
    $this->SetFont('helvetica', 'B', 16);
    $this->Cell(0, 0, 'Bon de Travail / Régie');
  }
  function Footer() {
    $this->SetXY(15, $this->h - 10);
    $this->Line($this->GetX(), floor($this->GetY() - 2), ceil($this->w - $this->rMargin), floor($this->GetY() - 2));
    $this->SetFont('helvetica', '', 8);
    $this->Cell($this->w - 30, 0, 'Righini Construction Métalliques — Ancienne Pointe 38 — CH-1920 Martigny', 'C');
  }
}
?>
