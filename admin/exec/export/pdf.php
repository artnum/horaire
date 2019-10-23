<?PHP
include('artnum/autoload.php');

class HorairePDF extends artnum\PDF {
  protected $Options = array(
    'doctype' => '',
    'name' => ''
  );

  function __construct($options = array()) {
    parent::__construct();
    $this->SetMargins(15, 40, 10);
    $this->SetFont('helvetica');
    $this->Options = array_merge($this->Options, $options);
  }

  function Header() {
    $this->SetXY(15, 15);
    $this->SetFont('helvetica', 'B', 16);
    if ($this->Options['doctype'] !== 'R') {
      $this->printLn('Bon de Travail');
    } else {
      $this->printLn('Régie');
    }
    if (!empty($this->Options['name'])) {
      $this->SetFontSize(4);
      $name = $this->Options['name'];
      if ($this->getStringWidth($this->Options['name']) > 130) {
        $words = explode(' ', $this->Options['name']);
        for ($n = $words[0]; $this->getStringWidth($n . ' ...') <= 130; $n .= ' ' . $words[0]) {
          array_shift($words);
        }
        $name = $n . ' ...';
      }
      $this->printLn($name);
      $this->resetFontSize();
    }
  }
  function Footer() {
    $this->SetXY(15, $this->h - 10);
    $this->Line($this->GetX(), floor($this->GetY() - 2), ceil($this->w - $this->rMargin), floor($this->GetY() - 2));
    $this->SetFont('helvetica', '', 8);
    $this->Cell($this->w - 30, 0, 'Righini Construction Métalliques — Ancienne Pointe 38 — CH-1920 Martigny', 'C');
  }
}
?>
