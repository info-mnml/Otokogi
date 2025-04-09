type StatsTableProps = {
  data: { key: string; value: string | number }[];
};

export default function StatsTable({ data }: StatsTableProps) {
  return (
    <table className="w-full text-sm text-left">
      <tbody>
        {data.map((item) => (
          <tr key={item.key}>
            <td className="py-2 pr-4 font-medium">{item.key}</td>
            <td>{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
