import Modal from './Modal';
import FormPanel from './FormPanel';

/** Form trong hộp thoại. Props giống FormPanel, thêm tieuDe và onDong. */
export default function FormModal({ tieuDe, onDong, rong = false, ...phan }) {
  return (
    <Modal tieuDe={tieuDe} onDong={onDong} rong={rong}>
      <FormPanel {...phan} onHuy={onDong} />
    </Modal>
  );
}
