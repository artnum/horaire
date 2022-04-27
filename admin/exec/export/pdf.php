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
    $this->block('title');
    if ($this->get('color-type')) {
      $this->background_block($this->get('color-type'));
      $color = $this->get('color-type');
      $r = pow(hexdec(substr($color, 1, 2)) / 255, 2.2);
      $g = pow(hexdec(substr($color, 3, 2)) / 255, 2.2);
      $b = pow(hexdec(substr($color, 5, 2)) / 255, 2.2);
      if (0.2126 * $r + 0.7151 * $g + 0.0721 * $b < 0.5) {
        $this->setColor('white');
      }
    } else {
      $this->background_block('#FFFFFF');
    }
    if ($this->Options['doctype'] !== 'R') {
      $this->printLn('Bon de Travail', ['break' => false]);
    } else {
      $this->printLn('Régie', ['break' => false]);
    }
    if ($this->get('work-type')) {
      $this->setFontSize(3);
      $r = $this->rMargin;
      $this->rMargin = 46;
      $this->printLn($this->get('work-type'), ['break' => false, 'align' => 'right']);
      $this->rMargin = $r;
    } 
    
    $this->br();
    
    $this->close_block();
    $this->setColor('black');
    if (!empty($this->Options['name'])) {
      $this->SetY($this->GetY() + 1);
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
