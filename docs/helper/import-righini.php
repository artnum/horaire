<?PHP

function searchInsertCategory($db, $category) {
   $query = 'SELECT * FROM category WHERE category_name = :category';
   try {
      $st = $db->prepare($query);
      $st->bindParam(':category', $category, PDO::PARAM_STR);
      $st->execute();
   } catch (Exception $e) {
      die($e->getMessage());
   }

   $cats = $st->fetchAll(PDO::FETCH_ASSOC);
   if (count($cats) === 0) {
      $iquery = 'INSERT INTO category (category_name, category_created, category_modified)
         VALUES (:category, :time, :time)';
      $now = time();
      $st = $db->prepare($iquery);
      $st->bindParam(':category', $category, PDO::PARAM_STR);
      $st->bindParam(':time', $now, PDO::PARAM_INT);
      if ($st->execute()) {
         return $db->lastInsertId();
      }
   } else if (count($cats) === 1) {
      return $cats[0]['category_id'];
   } else {
      die('Duplicate category. Cannot progress.');
   }
}

if (is_file($argv[1]) && is_readable($argv[1]) && is_file($argv[2]) && is_writable($argv[2])) {
   $fp = fopen($argv[1], 'r');
   if (!$fp) { die('Fichier inaccessible'); }
   try {
      $db = new PDO('sqlite:' . $argv[2]);
   } catch (Exception $e) {
      die($e->getMessage());
   }

   $category = null; 
   $first = true;
   while (($line = fgetcsv($fp)) !== FALSE) {
      if ($first) { $first = false; continue; }
      $skip = true;
      foreach ($line as $v) {
         if (!empty($v)) {
            $skip = false;
            break;
         }
      }
      if ($skip) { continue; }

      if (!empty($line[0])) {
         $category = searchInsertCategory($db, $line[0]);
      }
      
      if (!empty($line[2])) {
         $now = time();
         $price = 0.0;
         if (!empty($line[10])) {
            $price = floatval($line[10]);
         }
         $unit = '';
         if (!empty($line[11])) {
            list($x, $unit) = explode('/', $line[11], 2);
         }

         $query = 'INSERT INTO item (item_category, item_name, item_price, item_unit, item_created, item_modified) VALUES
            (:category, :name, :price, :unit, :time, :time)';
         try {
            $st = $db->prepare($query);
            $st->bindParam(':category', $category, PDO::PARAM_INT);
            $st->bindParam(':time', $now, PDO::PARAM_INT);
            $st->bindParam(':price', $price, PDO::PARAM_STR);
            $st->bindParam(':name', $line[2], PDO::PARAM_STR);
            $st->bindParam(':unit', $unit, PDO::PARAM_STR);
            $st->execute();
         } catch (Exception $e) {
            echo 'Cannot insert "' . $line[2] . '" : ' . $e->getMessage();
         }
      }
      
   }
}
?>
