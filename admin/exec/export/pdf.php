<?PHP
include('artnum/autoload.php');

use Endroid\QrCode\Bacon\MatrixFactory;
use Endroid\QrCode\Label\LabelInterface;
use Endroid\QrCode\Logo\LogoInterface;
use Endroid\QrCode\QrCodeInterface;
use Endroid\QrCode\Writer\Result\PdfResult;
use Endroid\QrCode\Writer\Result\ResultInterface;

class PdfWriter
{
    public const WRITER_OPTION_UNIT = 'unit';
    public const WRITER_OPTION_PDF = 'fpdf';
    public const WRITER_OPTION_X = 'x';
    public const WRITER_OPTION_Y = 'y';
    public const WRITER_OPTION_LINK = 'link';

    public function write(QrCodeInterface $qrCode, LogoInterface $logo = null, LabelInterface $label = null, array $options = []): ResultInterface
    {
        $matrixFactory = new MatrixFactory();
        $qrCode->setSize($qrCode->getSize() * 100);
        $matrix = $matrixFactory->create($qrCode);
        $qrCode->setSize($qrCode->getSize() / 100);

        $unit = 'mm';
        if (isset($options[self::WRITER_OPTION_UNIT])) {
            $unit = $options[self::WRITER_OPTION_UNIT];
        }

        $allowedUnits = ['mm', 'pt', 'cm', 'in'];
        if (!in_array($unit, $allowedUnits)) {
            throw new \Exception(sprintf('PDF Measure unit should be one of [%s]', implode(', ', $allowedUnits)));
        }

        $labelSpace = 0;
        if ($label instanceof LabelInterface) {
            $labelSpace = 30;
        }

        if (!class_exists(\FPDF::class)) {
            throw new \Exception('Unable to find FPDF: check your installation');
        }

        $foregroundColor = $qrCode->getForegroundColor();
        if ($foregroundColor->getAlpha() > 0) {
            throw new \Exception('PDF Writer does not support alpha channels');
        }
        $backgroundColor = $qrCode->getBackgroundColor();
        if ($backgroundColor->getAlpha() > 0) {
            throw new \Exception('PDF Writer does not support alpha channels');
        }

        $outerSize = ($matrix->getInnerSize() / 100) + (2 * $qrCode->getMargin());
        $marginLeft = ($outerSize - ($matrix->getInnerSize() / 100)) / 2;
        if (isset($options[self::WRITER_OPTION_PDF])) {
            $fpdf = $options[self::WRITER_OPTION_PDF];
            if (!$fpdf instanceof \FPDF) {
                throw new \Exception('pdf option must be an instance of FPDF');
            }
        } else {
            // @todo Check how to add label height later
            $fpdf = new \FPDF('P', $unit, [$outerSize, $outerSize + $labelSpace]);
            $fpdf->AddPage();
        }

        $x = 0;
        if (isset($options[self::WRITER_OPTION_X])) {
            $x = $options[self::WRITER_OPTION_X];
        }
        $y = 0;
        if (isset($options[self::WRITER_OPTION_Y])) {
            $y = $options[self::WRITER_OPTION_Y];
        }


        $fpdf->SetFillColor($backgroundColor->getRed(), $backgroundColor->getGreen(), $backgroundColor->getBlue());
        $fpdf->Rect($x, $y, $outerSize, $outerSize, 'F');
        $fpdf->SetFillColor($foregroundColor->getRed(), $foregroundColor->getGreen(), $foregroundColor->getBlue());

        for ($rowIndex = 0; $rowIndex < $matrix->getBlockCount(); ++$rowIndex) {
            for ($columnIndex = 0; $columnIndex < $matrix->getBlockCount(); ++$columnIndex) {
                if (1 === $matrix->getBlockValue($rowIndex, $columnIndex)) {
                    $fpdf->Rect(
                        $x + $marginLeft + ($columnIndex * ($matrix->getBlockSize() / 100)),
                        $y + $marginLeft + ($rowIndex * ($matrix->getBlockSize() / 100)),
                        $matrix->getBlockSize() / 100,
                        $matrix->getBlockSize() / 100,
                        'F'
                    );
                }
            }
        }

        if ($logo instanceof LogoInterface) {
            $this->addLogo($logo, $fpdf, $x, $y, $outerSize);
        }

        if ($label instanceof LabelInterface) {
            $fpdf->SetXY($x, $y + $outerSize + $labelSpace - 25);
            $fpdf->SetFont('Helvetica', '', $label->getFont()->getSize());
            $fpdf->Cell($outerSize, 0, $label->getText(), 0, 0, 'C');
        }

        if (isset($options[self::WRITER_OPTION_LINK])) {
            $link = $options[self::WRITER_OPTION_LINK];
            $fpdf->Link($x, $y, $x + $outerSize, $y + $outerSize, $link);
        }

        return new PdfResult($matrix, $fpdf);
    }

    private function addLogo(LogoInterface $logo, \FPDF $fpdf, float $x, float $y, float $size): void
    {
        $logoPath = $logo->getPath();
        $logoHeight = $logo->getResizeToHeight();
        $logoWidth = $logo->getResizeToWidth();

        if (null === $logoHeight || null === $logoWidth) {
            $imageSize = \getimagesize($logoPath);
            if (!$imageSize) {
                throw new \Exception(sprintf('Unable to read image size for logo "%s"', $logoPath));
            }
            [$logoSourceWidth, $logoSourceHeight] = $imageSize;

            if (null === $logoWidth) {
                $logoWidth = (int) $logoSourceWidth;
            }

            if (null === $logoHeight) {
                $aspectRatio = $logoWidth / $logoSourceWidth;
                $logoHeight = (int) ($logoSourceHeight * $aspectRatio);
            }
        }

        $logoX = $x + $size / 2 - $logoWidth / 2;
        $logoY = $y + $size / 2 - $logoHeight / 2;

        $fpdf->Image($logoPath, $logoX, $logoY, $logoWidth, $logoHeight);
    }
}


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
      $this->setColor($this->getBWFromColor($color));
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
