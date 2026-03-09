interface Props {
  speed: number
  occupancy: number
  busId: string
}

const MAX_CAPACITY = 30

export default function BottomPanel({ speed, occupancy, busId }: Props) {
  return (
    <div
      className="absolute bottom-0 left-0 w-full z-[2000] flex justify-between items-end px-5 pb-5"
      style={{
        background: 'linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0))',
        paddingTop: '50px',
      }}
    >
      <div className="bg-white px-5 py-[10px] rounded-xl border border-gray-200 flex gap-4 items-center shadow-md">
        <div>
          <div className="text-[10px] text-gray-500 font-bold uppercase">Passageiros</div>
          <div className="font-rajdhani text-2xl font-bold text-gray-900">
            <i className="fas fa-users mr-1" />
            <span>{occupancy}</span>
            <span className="text-base font-semibold text-gray-400">/{MAX_CAPACITY}</span>
          </div>
        </div>
        <div className="text-right border-l border-gray-200 pl-4 ml-2">
          <div className="text-[10px] text-gray-500 font-bold uppercase">Linha</div>
          <div className="font-bold text-gray-900 text-base">{busId}</div>
        </div>
      </div>

      <div
        className="w-[80px] h-[80px] rounded-full bg-white border-4 border-[#3b82f6] flex flex-col items-center justify-center text-gray-900"
        style={{ boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}
      >
        <div className="font-rajdhani text-[32px] font-extrabold leading-none">{speed}</div>
        <div className="text-[10px] font-bold text-gray-500">km/h</div>
      </div>
    </div>
  )
}
