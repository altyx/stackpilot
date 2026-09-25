import { makeContainer, makeImage, makeVolume } from '../testing/fixtures';
import {
  countDeletedImages,
  imageLabel,
  imagesWithUsage,
  isDangling,
  pruneCandidates,
  reclaimableBytes,
  shortImageId,
  volumesWithUsage,
} from './usage';

describe('imagesWithUsage', () => {
  const images = [
    makeImage({ Id: 'sha256:aaa', RepoTags: ['redis:7'] }),
    makeImage({ Id: 'sha256:bbb', RepoTags: ['nginx:1.27'] }),
  ];

  it('links containers to images by id, then by tag as a fallback', () => {
    const containers = [
      makeContainer({ Names: ['/web'], ImageID: 'sha256:bbb', Image: 'nginx:1.27' }),
      makeContainer({ Names: ['/cache'], ImageID: 'sha256:unknown', Image: 'redis:7' }),
    ];
    expect(
      imagesWithUsage(images, containers).map((usage) => [imageLabel(usage.item), usage.usedBy]),
    ).toEqual([
      ['nginx:1.27', ['web']],
      ['redis:7', ['cache']],
    ]);
  });

  it('lists each container once, sorted by name, even when id and tag both match', () => {
    const containers = [
      makeContainer({ Names: ['/web-2'], ImageID: 'sha256:bbb', Image: 'nginx:1.27' }),
      makeContainer({ Names: ['/web-1'], ImageID: 'sha256:bbb', Image: 'nginx:1.27' }),
    ];
    const [nginx] = imagesWithUsage(images, containers);
    expect(nginx.usedBy).toEqual(['web-1', 'web-2']);
  });

  it('marks images no container references as unused', () => {
    expect(imagesWithUsage(images, []).map((usage) => usage.usedBy)).toEqual([[], []]);
  });
});

describe('volumesWithUsage', () => {
  it('only counts named volume mounts, sorted by volume name', () => {
    const volumes = [makeVolume({ Name: 'pgdata' }), makeVolume({ Name: 'cache' })];
    const containers = [
      makeContainer({
        Names: ['/db'],
        Mounts: [
          {
            Type: 'volume',
            Name: 'pgdata',
            Source: '',
            Destination: '/var/lib/postgresql',
            RW: true,
          },
          { Type: 'bind', Source: '/srv', Destination: '/data', RW: true },
        ],
      }),
    ];
    expect(volumesWithUsage(volumes, containers)).toMatchObject([
      { item: { Name: 'cache' }, usedBy: [] },
      { item: { Name: 'pgdata' }, usedBy: ['db'] },
    ]);
  });
});

describe('isDangling', () => {
  it('is true for images without a real tag', () => {
    expect(isDangling(makeImage({ RepoTags: null }))).toBe(true);
    expect(isDangling(makeImage({ RepoTags: ['<none>:<none>'] }))).toBe(true);
  });

  it('is false for tagged images', () => {
    expect(isDangling(makeImage({ RepoTags: ['nginx:1.27'] }))).toBe(false);
  });
});

describe('imageLabel', () => {
  it('prefers the first real tag', () => {
    expect(imageLabel(makeImage({ RepoTags: ['<none>:<none>', 'app:1.0'] }))).toBe('app:1.0');
  });

  it('falls back to the short id', () => {
    expect(imageLabel(makeImage({ Id: 'sha256:abcdef0123456789', RepoTags: null }))).toBe(
      'abcdef012345',
    );
  });
});

describe('shortImageId', () => {
  it('drops the digest prefix and keeps 12 characters', () => {
    expect(shortImageId('sha256:abcdef0123456789')).toBe('abcdef012345');
  });
});

describe('reclaimableBytes', () => {
  it('sums the size of unused images only', () => {
    const usages = [
      { item: makeImage({ Size: 300 }), usedBy: ['web'] },
      { item: makeImage({ Size: 500 }), usedBy: [] },
      { item: makeImage({ Size: 700 }), usedBy: [] },
    ];
    expect(reclaimableBytes(usages)).toBe(1_200);
  });
});

describe('pruneCandidates', () => {
  const tagged = makeImage({ Id: 'sha256:tagged', RepoTags: ['app:1'] });
  const dangling = makeImage({ Id: 'sha256:dangling', RepoTags: [] });
  const danglingInUse = makeImage({ Id: 'sha256:running', RepoTags: null });
  const usages = [
    { item: tagged, usedBy: [] },
    { item: dangling, usedBy: [] },
    { item: danglingInUse, usedBy: ['web'] },
    { item: makeImage({ Id: 'sha256:used' }), usedBy: ['api'] },
  ];

  it('keeps unused untagged images for a dangling cleanup', () => {
    expect(pruneCandidates(usages, 'dangling')).toEqual([dangling]);
  });

  it('keeps every unused image for a full cleanup', () => {
    expect(pruneCandidates(usages, 'unused')).toEqual([tagged, dangling]);
  });

  it('treats a <none>:<none> tag as untagged', () => {
    const none = makeImage({ RepoTags: ['<none>:<none>'] });
    expect(pruneCandidates([{ item: none, usedBy: [] }], 'dangling')).toEqual([none]);
  });

  it('returns nothing when every image is in use', () => {
    expect(pruneCandidates([{ item: tagged, usedBy: ['web'] }], 'unused')).toEqual([]);
  });
});

describe('countDeletedImages', () => {
  it('counts listed images only, not untagged references or layers', () => {
    const images = [makeImage({ Id: 'sha256:a' }), makeImage({ Id: 'sha256:b' })];
    const deleted = [{ Untagged: 'app:1' }, { Deleted: 'sha256:a' }, { Deleted: 'sha256:layer' }];
    expect(countDeletedImages(images, deleted)).toBe(1);
  });

  it('counts nothing when Docker deleted nothing', () => {
    expect(countDeletedImages([makeImage()], [])).toBe(0);
  });
});
